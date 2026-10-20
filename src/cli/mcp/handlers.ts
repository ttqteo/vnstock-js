import type { Client } from "../../client";
import type { Quote } from "../../types";
import type { WhereClause } from "../../client/screen";
import type { StatementKind } from "../../client/company";
import { textResponse, errorResponse, McpToolResponse } from "./formatters";
import { TTLCache, QUOTE_TTL_MS, AI_CONTEXT_TTL_MS } from "./cache";
import { money, price } from "../format/money";
import { Watchlist } from "../../watchlist";
import { fileStorage } from "../../node";
import { ictToday } from "../../shared/time";

export type Handler = (args: any) => Promise<McpToolResponse>;

type ExchangeArg = "HOSE" | "HNX" | "UPCOM" | "ALL";
const EXCHANGE_ARGS: ExchangeArg[] = ["HOSE", "HNX", "UPCOM", "ALL"];

const REPORTS: Record<string, StatementKind> = {
  balance_sheet: "balance",
  income_statement: "income",
  cash_flow: "cashflow",
  ratios: "ratios",
};

const RANGES = ["1d", "5d", "1mo", "3mo", "6mo", "ytd", "1y", "2y", "5y", "max"];
const PRESETS = ["breakout", "oversold_bounce", "ema_cross"];

const LEGACY_OPERATORS: Record<string, keyof WhereClause> = { "<": "lt", "<=": "lte", ">": "gt", ">=": "gte", "=": "eq" };

function symbolArg(args: any): string {
  return String(args.symbol || "")
    .toUpperCase()
    .trim();
}

function parseExchange(raw: any): ExchangeArg | null {
  if (raw === undefined || raw === null || raw === "") return "HOSE";
  var up = String(raw).toUpperCase().trim();
  if (up === "HSX") up = "HOSE";
  return EXCHANGE_ARGS.indexOf(up as ExchangeArg) === -1 ? null : (up as ExchangeArg);
}

function num(v: any, fallback: number): number {
  return typeof v === "number" && isFinite(v) ? v : fallback;
}

/** Percent with a sign, one decimal; "n/a" when unknown. */
function pct(n: number | null): string {
  return n === null ? "n/a" : (n > 0 ? "+" : "") + n.toFixed(1) + "%";
}

function signed(dong: number): string {
  return (dong >= 0 ? "+" : "") + money(dong);
}

function message(e: any): string {
  return (e && (e.hint ? e.message + " " + e.hint : e.message)) || String(e);
}

function quoteSummary(q: Quote): string {
  var sign = q.changePct > 0 ? "+" : "";
  return (
    q.symbol +
    " " +
    (q.name || "") +
    "\n" +
    "Giá: " +
    price(q.price) +
    "  (" +
    sign +
    q.changePct.toFixed(2) +
    "%)  KL: " +
    (q.volume || 0).toLocaleString() +
    "\n" +
    "Trần/Sàn: " +
    price(q.ceiling) +
    " / " +
    price(q.floor) +
    "  Tham chiếu: " +
    price(q.ref)
  );
}

/** where clauses from the screen_stocks arguments; v1-style filters are still understood. */
function whereFrom(args: any): Record<string, WhereClause> | string {
  var where: Record<string, WhereClause> = args.where && typeof args.where === "object" ? { ...args.where } : {};
  var filters = Array.isArray(args.filters) ? args.filters : [];
  for (var i = 0; i < filters.length; i++) {
    var f = filters[i];
    var op = f && LEGACY_OPERATORS[f.operator];
    if (!f || !f.field || !op || f.value === undefined) return "Mỗi filter cần đủ 'field', 'operator' (<, <=, >, >=, =) và 'value'.";
    where[f.field] = { ...(where[f.field] || {}), [op]: f.value };
  }
  return where;
}

/**
 * MCP tool handlers over one client. Tool names and arguments match tools.ts; money and prices
 * in summaries are printed from dong.
 */
export function createHandlers(client: Client, options: { watchlist?: Watchlist } = {}): Record<string, Handler> {
  const quoteCache = new TTLCache<Quote>(QUOTE_TTL_MS);
  const aiCache = new TTLCache<any>(AI_CONTEXT_TTL_MS);
  // Same file as v1: ~/.vnstock-js/watchlist.json.
  const watchlist = options.watchlist || new Watchlist(fileStorage());

  async function handleGetQuote(args: any): Promise<McpToolResponse> {
    var symbol = symbolArg(args);
    if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");
    var cached = quoteCache.get(symbol);
    if (cached) return textResponse(quoteSummary(cached), cached);
    try {
      var list = (await client.prices([symbol])).filter((q) => q && q.symbol);
      if (list.length === 0) {
        return errorResponse(`Không tìm thấy mã "${symbol}". Hãy thử search_symbols với tên công ty.`);
      }
      quoteCache.set(symbol, list[0]);
      return textResponse(quoteSummary(list[0]), list[0]);
    } catch (e: any) {
      return errorResponse(`Lỗi khi lấy giá ${symbol}: ${message(e)}`);
    }
  }

  async function handleGetHistory(args: any): Promise<McpToolResponse> {
    var symbol = symbolArg(args);
    if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");
    var limit = typeof args.limit === "number" ? args.limit : 30;
    try {
      var bars = args.from
        ? await client.stock(symbol).history({ from: String(args.from), to: args.to ? String(args.to) : undefined })
        : await client.stock(symbol).history("3mo");
      var sliced = bars.slice(-limit);
      var span = sliced.length ? sliced[0].time + " đến " + sliced[sliced.length - 1].time : "không có phiên nào";
      return textResponse(`${symbol}: ${sliced.length} phiên (${span})`, sliced);
    } catch (e: any) {
      return errorResponse(`Lỗi khi lấy lịch sử ${symbol}: ${message(e)}`);
    }
  }

  async function handleSearchSymbols(args: any): Promise<McpToolResponse> {
    var query = String(args.query || "").trim();
    if (!query) return errorResponse("Thiếu tham số 'query'.");
    var limit = typeof args.limit === "number" ? args.limit : 10;
    try {
      var results = await client.search(query, { limit });
      return textResponse(`Tìm thấy ${results.length} kết quả cho "${query}"`, results);
    } catch (e: any) {
      return errorResponse(`Lỗi khi tìm kiếm: ${message(e)}`);
    }
  }

  async function handleListSymbols(args: any): Promise<McpToolResponse> {
    var exchange = args.exchange ? String(args.exchange).toUpperCase() : null;
    var limit = typeof args.limit === "number" ? args.limit : undefined;
    try {
      var list = await client.symbols(exchange ? { exchange } : {});
      if (limit) list = list.slice(0, limit);
      return textResponse(exchange ? `Sàn ${exchange}: ${list.length} mã` : `Tổng: ${list.length} mã`, list);
    } catch (e: any) {
      return errorResponse(`Lỗi khi liệt kê mã: ${message(e)}`);
    }
  }

  async function handleTopMovers(args: any): Promise<McpToolResponse> {
    var limit = typeof args.limit === "number" ? args.limit : 10;
    try {
      var movers = await client.topMovers({ limit });
      return textResponse(`Top ${limit} tăng + ${limit} giảm hôm nay`, movers);
    } catch (e: any) {
      return errorResponse(`Lỗi: ${message(e)}`);
    }
  }

  async function handleIsTradeDay(args: any): Promise<McpToolResponse> {
    try {
      var date = args.date ? String(args.date) : ictToday();
      var isTrade = await client.calendar.isTradingDay(date);
      return textResponse(`Ngày ${date}: ${isTrade ? "có giao dịch" : "không có giao dịch (nghỉ lễ hoặc cuối tuần)"}`, { date, isTradeDay: isTrade });
    } catch (e: any) {
      return errorResponse(`Lỗi: ${message(e)}`);
    }
  }

  async function handleGetTradingCalendar(args: any): Promise<McpToolResponse> {
    var year = Number(args.year);
    if (!year || year < 1900) return errorResponse("Thiếu hoặc invalid 'year'.");
    try {
      var holidays = await client.calendar.holidays(year);
      return textResponse(`Năm ${year}: ${holidays.length} ngày nghỉ lễ TTCK`, { year, holidays });
    } catch (e: any) {
      return errorResponse(`Lỗi: ${message(e)}`);
    }
  }

  async function handleGetCompanyInfo(args: any): Promise<McpToolResponse> {
    var symbol = symbolArg(args);
    if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");
    try {
      var info = (await client.symbols()).find((s) => s.symbol === symbol);
      if (!info) return errorResponse(`Không tìm thấy mã "${symbol}". Hãy thử search_symbols.`);
      return textResponse(`${symbol}: ${info.companyName} · ${info.exchange}`, info);
    } catch (e: any) {
      return errorResponse(`Lỗi: ${message(e)}`);
    }
  }

  async function handleGetDividends(args: any): Promise<McpToolResponse> {
    var symbol = symbolArg(args);
    if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");
    try {
      var dividends = await client.stock(symbol).dividends();
      return textResponse(`${symbol}: ${dividends.length} sự kiện cổ tức`, dividends);
    } catch (e: any) {
      return errorResponse(`Lỗi khi lấy cổ tức ${symbol}: ${message(e)}`);
    }
  }

  async function handleGetCorporateEvents(args: any): Promise<McpToolResponse> {
    var symbol = symbolArg(args);
    if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");
    try {
      var events = await client.stock(symbol).events();
      return textResponse(`${symbol}: ${events.length} sự kiện doanh nghiệp`, events);
    } catch (e: any) {
      return errorResponse(`Lỗi khi lấy sự kiện ${symbol}: ${message(e)}`);
    }
  }

  async function handleGetAIContext(args: any): Promise<McpToolResponse> {
    var symbol = symbolArg(args);
    if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");
    var lookback = typeof args.lookback === "number" ? args.lookback : 200;
    var asOf = args.as_of ? String(args.as_of) : undefined;
    // asOf is part of the key: the same symbol at two dates is two answers.
    var key = symbol + "|" + lookback + "|" + (asOf || "latest");
    var cached = aiCache.get(key);
    if (cached) return textResponse(`AI context cho ${symbol} (cached)`, cached);
    try {
      var ctx = await client.stock(symbol).context({ lookback, asOf });
      aiCache.set(key, ctx);
      return textResponse(`${symbol}: trend ${ctx.trend.direction} (${(ctx.trend.strength * 100).toFixed(0)}%)`, ctx);
    } catch (e: any) {
      return errorResponse(`Lỗi khi build AI context ${symbol}: ${message(e)}`);
    }
  }

  async function handleToAIPrompt(args: any): Promise<McpToolResponse> {
    var symbol = symbolArg(args);
    if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");
    try {
      var text = await client.stock(symbol).prompt({ lang: args.lang === "en" ? "en" : "vi", asOf: args.as_of ? String(args.as_of) : undefined });
      return textResponse(text);
    } catch (e: any) {
      return errorResponse(`Lỗi: ${message(e)}`);
    }
  }

  async function handleCompareSymbols(args: any): Promise<McpToolResponse> {
    var symbols = Array.isArray(args.symbols) ? args.symbols : [];
    if (symbols.length < 2) return errorResponse("Cần ≥2 mã để so sánh.");
    if (symbols.length > 10) return errorResponse("Tối đa 10 mã.");
    try {
      var upper = symbols.map((s: any) => String(s).toUpperCase());
      var list = await client.prices(upper);
      return textResponse(`So sánh ${list.length} mã: ${upper.join(", ")}`, list);
    } catch (e: any) {
      return errorResponse(`Lỗi: ${message(e)}`);
    }
  }

  async function handleGetMarketBreadth(args: any): Promise<McpToolResponse> {
    var exchange = parseExchange(args.exchange);
    if (!exchange) return errorResponse(`Sàn không hợp lệ. Chọn: ${EXCHANGE_ARGS.join(", ")}.`);
    try {
      var b = await client.market.breadth({ exchange });
      var summary =
        `${b.exchange} ${b.date}: tăng ${b.advancing}, giảm ${b.declining}, đứng giá ${b.unchanged}` +
        ` (trần ${b.ceiling}, sàn ${b.floor}) trên ${b.total} mã có giao dịch`;
      return textResponse(summary, b);
    } catch (e: any) {
      return errorResponse(`Lỗi khi lấy độ rộng thị trường: ${message(e)}`);
    }
  }

  async function handleGetForeignFlow(args: any): Promise<McpToolResponse> {
    var symbol = args.symbol ? symbolArg(args) : "";
    try {
      if (symbol) {
        var one = await client.stock(symbol).foreign();
        return textResponse(`${one.symbol} ${one.date}: khối ngoại ${one.netValue >= 0 ? "mua ròng" : "bán ròng"} ${money(Math.abs(one.netValue))}`, one);
      }
      var exchange = parseExchange(args.exchange);
      if (!exchange) return errorResponse(`Sàn không hợp lệ. Chọn: ${EXCHANGE_ARGS.join(", ")}.`);
      var top = typeof args.top === "number" ? args.top : 10;
      var flow = await client.market.foreign({ exchange, top });
      var summary =
        `${flow.exchange} ${flow.date}: khối ngoại ${flow.netValue >= 0 ? "mua ròng" : "bán ròng"} ${money(Math.abs(flow.netValue))} ` +
        `(mua ${money(flow.buyValue)}, bán ${money(flow.sellValue)})`;
      return textResponse(summary, flow);
    } catch (e: any) {
      return errorResponse(`Lỗi khi lấy dữ liệu khối ngoại: ${message(e)}`);
    }
  }

  async function handleGetMarketContext(args: any): Promise<McpToolResponse> {
    var exchange = parseExchange(args.exchange);
    if (!exchange) return errorResponse(`Sàn không hợp lệ. Chọn: ${EXCHANGE_ARGS.join(", ")}.`);
    try {
      var ctx = await client.market.context({
        exchange,
        index: args.index ? String(args.index) : undefined,
        asOf: args.as_of ? String(args.as_of) : undefined,
      });
      var summary =
        `${ctx.index.symbol} ${ctx.date}: ${ctx.index.close} điểm ` +
        `(${ctx.index.changePercent === null ? "n/a" : ctx.index.changePercent + "%"}), ` +
        `regime ${ctx.regime}, thanh khoản ${money(ctx.liquidity.value)} (${ctx.liquidity.signal})`;
      return textResponse(summary, ctx);
    } catch (e: any) {
      return errorResponse(`Lỗi khi build bối cảnh thị trường: ${message(e)}`);
    }
  }

  async function handleGetNews(args: any): Promise<McpToolResponse> {
    var date = args.date ? String(args.date) : undefined;
    var limit = typeof args.limit === "number" ? args.limit : 20;
    try {
      var items = await client.news({ date, source: args.source ? String(args.source) : undefined, query: args.keyword ? String(args.keyword) : undefined });
      var sliced = items.slice(0, limit);
      var filter = args.keyword ? ` khớp "${args.keyword}"` : args.source ? ` từ ${args.source}` : "";
      if (sliced.length === 0) return textResponse(`Không có tin${filter} cho ngày ${date || "hôm nay"}.`, []);
      return textResponse(`${sliced.length} tin${filter} ngày ${date || "hôm nay"}`, sliced);
    } catch (e: any) {
      return errorResponse(`Lỗi khi lấy tin tức: ${message(e)}`);
    }
  }

  async function handleGetFinancials(args: any): Promise<McpToolResponse> {
    var symbol = symbolArg(args);
    if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");
    var reportArg = String(args.report || "balance_sheet").toLowerCase();
    var kind = REPORTS[reportArg];
    if (!kind) return errorResponse(`Loại báo cáo không hợp lệ. Chọn: ${Object.keys(REPORTS).join(", ")}.`);
    var period: "year" | "quarter" = args.period === "year" ? "year" : "quarter";
    try {
      var result = await client.stock(symbol).financials(kind, { period });
      return textResponse(`${symbol}: ${reportArg} theo ${period}, đơn vị đồng`, result);
    } catch (e: any) {
      return errorResponse(`Lỗi khi lấy báo cáo tài chính ${symbol}: ${message(e)}`);
    }
  }

  async function handleScreenStocks(args: any): Promise<McpToolResponse> {
    var group = args.group ? String(args.group).toUpperCase() : undefined;
    var exchange = args.exchange ? String(args.exchange).toUpperCase() : undefined;
    if (!group && !exchange) {
      return errorResponse(
        "Cần chỉ định phạm vi: 'group' (VN30, HNX30...) hoặc 'exchange' (HOSE, HNX, UPCOM). " +
          "Chỉ số tài chính phải lấy theo từng mã nên không quét cả thị trường trong một lần."
      );
    }
    var where = whereFrom(args);
    if (typeof where === "string") return errorResponse(where);
    var sort = args.sort ? String(args.sort) : args.sort_by ? (args.order === "asc" ? "" : "-") + String(args.sort_by) : undefined;
    try {
      var rows = await client.screen({ group, exchange, where, sort, limit: typeof args.limit === "number" ? args.limit : 20 });
      return textResponse(`${group || exchange}: ${rows.length} mã khớp điều kiện`, rows);
    } catch (e: any) {
      return errorResponse(`Lỗi khi sàng lọc: ${message(e)}`);
    }
  }

  async function handleGetGoldPrice(args: any): Promise<McpToolResponse> {
    var source = args.source ? String(args.source).toLowerCase() : "auto";
    if (["auto", "btmc", "giavangnet"].indexOf(source) === -1) return errorResponse("Nguồn không hợp lệ. Chọn: auto, btmc, giavangnet.");
    try {
      var result = await client.gold({ source: source as any });
      return textResponse(`Giá vàng từ ${result.source}: ${result.items.length} loại, đơn vị đồng/lượng`, result.items);
    } catch (e: any) {
      return errorResponse(`Lỗi khi lấy giá vàng: ${message(e)}`);
    }
  }

  async function handleGetExchangeRate(args: any): Promise<McpToolResponse> {
    try {
      var rates = await client.fx({ date: args.date ? String(args.date) : undefined });
      if (args.currency) {
        var want = String(args.currency).toUpperCase();
        rates = rates.filter((r) => String(r.currencyCode || "").toUpperCase() === want);
        if (rates.length === 0) return errorResponse(`Không tìm thấy tỷ giá cho "${args.currency}".`);
      }
      return textResponse(`Tỷ giá Vietcombank: ${rates.length} loại tiền, đơn vị đồng`, rates);
    } catch (e: any) {
      return errorResponse(`Lỗi khi lấy tỷ giá: ${message(e)}`);
    }
  }

  async function handleWatchlist(args: any): Promise<McpToolResponse> {
    var action = String(args.action || "")
      .toLowerCase()
      .trim();
    var name = args.name ? String(args.name) : "";
    var symbols: string[] = Array.isArray(args.symbols) ? args.symbols.map((s: any) => String(s).toUpperCase()) : [];

    // Every action except list_all operates on one named list.
    if (action !== "list_all" && !name) return errorResponse("Thiếu tham số 'name'.");

    try {
      switch (action) {
        case "list_all": {
          var all = await watchlist.listAll();
          return textResponse(`${all.length} danh sách theo dõi` + (all.length ? ": " + all.join(", ") : ""), all);
        }
        case "list": {
          var items = await watchlist.list(name);
          return textResponse(`${name}: ${items.length} mã` + (items.length ? ": " + items.join(", ") : ""), items);
        }
        case "create":
          await watchlist.create(name);
          return textResponse(`Đã tạo danh sách "${name}".`);
        case "delete":
          await watchlist.delete(name);
          return textResponse(`Đã xoá danh sách "${name}".`);
        case "add": {
          if (symbols.length === 0) return errorResponse("Thiếu tham số 'symbols'.");
          await watchlist.add(name, symbols);
          return textResponse(`Đã thêm ${symbols.join(", ")} vào "${name}".`, await watchlist.list(name));
        }
        case "remove": {
          if (symbols.length === 0) return errorResponse("Thiếu tham số 'symbols'.");
          for (var i = 0; i < symbols.length; i++) await watchlist.remove(name, symbols[i]);
          return textResponse(`Đã bỏ ${symbols.join(", ")} khỏi "${name}".`, await watchlist.list(name));
        }
        case "quote": {
          var list = await watchlist.list(name);
          if (list.length === 0) return textResponse(`Danh sách "${name}" đang trống.`, []);
          var board = await client.prices(list);
          return textResponse(`${name}: giá ${board.length} mã`, board);
        }
        default:
          return errorResponse("Hành động không hợp lệ. Chọn: list_all, list, create, delete, add, remove, quote.");
      }
    } catch (e: any) {
      return errorResponse(`Lỗi watchlist: ${message(e)}`);
    }
  }

  async function handleFindPatterns(args: any): Promise<McpToolResponse> {
    const symbol = symbolArg(args);
    if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");
    try {
      const r = await client.stock(symbol).patterns({ recent: typeof args.recent === "number" ? args.recent : 10 });
      const zones = r.zones
        .slice(0, 5)
        .map((z) => (z.kind === "support" ? "hỗ trợ " : "kháng cự ") + price(z.low) + "-" + price(z.high) + " (" + z.touches + " lần chạm)");
      const lines = [
        symbol + ": pattern trên nến ngày 1 năm",
        "Vùng giá: " + (zones.length ? zones.join("; ") : "không có"),
        "Vùng cực trị phiên cuối: " + (r.extreme === "bottom" ? "đáy" : r.extreme === "top" ? "đỉnh" : "không"),
        "Mẫu nến gần đây: " + (r.candles.length ? r.candles.map((c) => c.pattern + " (" + c.time + ")").join(", ") : "không có"),
        "Turtle: " + (r.turtle ? r.turtle.action + " " + r.turtle.time + ", dừng lỗ " + price(r.turtle.stop) : "chưa có tín hiệu"),
        "Breakout có khối lượng: " + (r.breakouts.length ? r.breakouts.map((b) => b.direction + " " + b.time).join(", ") : "không có"),
      ];
      return textResponse(lines.join("\n"), r);
    } catch (e: any) {
      return errorResponse(`Lỗi khi tìm pattern ${symbol}: ${message(e)}`);
    }
  }

  async function handleGetForeignHistory(args: any): Promise<McpToolResponse> {
    const range = args.range ? String(args.range) : "1mo";
    if (RANGES.indexOf(range) === -1) return errorResponse("Range không hợp lệ. Chọn: " + RANGES.join(", ") + ".");
    const symbol = symbolArg(args);
    const empty = "chưa có phiên nào được ghi. Dữ liệu khối ngoại chỉ có từ ngày bắt đầu ghi (năm 2026).";
    try {
      if (symbol) {
        const days = await client.stock(symbol).foreign(range as any);
        const net = days.reduce((sum, d) => sum + d.netValue, 0);
        return textResponse(days.length ? `${symbol} ${range}: ${days.length} phiên, ròng cộng dồn ${signed(net)}` : `${symbol} ${range}: ${empty}`, days);
      }
      const exchange = parseExchange(args.exchange);
      if (!exchange) return errorResponse("Sàn không hợp lệ. Chọn: HOSE, HNX, UPCOM, ALL.");
      const days = await client.market.foreign({ range: range as any, exchange });
      const net = days.reduce((sum, d) => sum + d.netValue, 0);
      return textResponse(days.length ? `${exchange} ${range}: ${days.length} phiên, ròng cộng dồn ${signed(net)}` : `${exchange} ${range}: ${empty}`, days);
    } catch (e: any) {
      return errorResponse(`Lỗi khi lấy lịch sử khối ngoại: ${message(e)}`);
    }
  }

  async function handlePortfolioSummary(args: any): Promise<McpToolResponse> {
    try {
      const given = Array.isArray(args.positions);
      const input = given ? { positions: args.positions, cash: args.cash } : await client.portfolio.load();
      if (given && args.save === true) await client.portfolio.save(input);
      if (input.positions.length === 0) {
        return textResponse(
          "Chưa có danh mục trong ~/.vnstock-js/portfolio.json. Truyền 'positions' (save: true để lưu), hoặc dùng vnstock portfolio add <symbol> <quantity> <cost>.",
          input
        );
      }
      const p = await client.portfolio(input);
      const t = p.totals;
      const lines = [
        `Danh mục ngày ${p.date}: NAV ${money(t.nav)}, cổ phiếu ${money(t.value)}, tiền mặt ${money(t.cash)}`,
        `Lãi/lỗ ${signed(t.pnl)} (${pct(t.pnlPct)})`,
        ...p.positions.map((x) => `${x.symbol} ${x.quantity} cp × ${price(x.price)} = ${money(x.value)} (${pct(x.pnlPct)})`),
      ];
      return textResponse(lines.join("\n"), p);
    } catch (e: any) {
      return errorResponse(`Lỗi khi tính danh mục: ${message(e)}`);
    }
  }

  async function handleBacktestSignal(args: any): Promise<McpToolResponse> {
    const raw: any[] = Array.isArray(args.symbols) ? args.symbols : args.symbol ? [args.symbol] : [];
    const symbols = raw.map((s) => String(s).toUpperCase().trim());
    if (symbols.length === 0) return errorResponse("Thiếu tham số 'symbols' hoặc 'symbol'.");
    const preset = String(args.preset || "");
    if (PRESETS.indexOf(preset) === -1) return errorResponse("Preset không hợp lệ. Chọn: " + PRESETS.join(", ") + ".");
    const opts: any = { tp: num(args.tp, 7), sl: num(args.sl, 4), hold: num(args.hold, 10), range: args.range ? String(args.range) : undefined };
    if (args.overlap === true) opts.overlap = true;
    try {
      const r = await client.backtest(symbols, preset as any, opts);
      const s = r.stats.all;
      const summary =
        `${preset} trên ${symbols.join(", ")}: ${s.trades} lệnh, thắng ${s.winRate === null ? "n/a" : Math.round(s.winRate * 100) + "%"}, ` +
        `lợi nhuận TB ${pct(s.avgRet)}, trung vị ${pct(s.medianRet)}, TP/SL/hết hạn ${s.tp}/${s.sl}/${s.timeout}. ` +
        "Không tính phí, trượt giá; kết quả quá khứ không bảo đảm tương lai.";
      return textResponse(summary, { stats: r.stats, trades: r.trades.slice(-50) });
    } catch (e: any) {
      return errorResponse(`Lỗi khi backtest: ${message(e)}`);
    }
  }

  async function handleFindSimilarSetups(args: any): Promise<McpToolResponse> {
    const symbol = symbolArg(args);
    if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");
    try {
      const r = await client.stock(symbol).similar({ top: typeof args.top === "number" ? args.top : 10 });
      const horizons: ("ret5" | "ret20" | "ret60")[] = ["ret5", "ret20", "ret60"];
      const lines = [
        `${symbol} ngày ${r.asOf}: ${r.matches.length} phiên có trạng thái giống (thử nghiệm)`,
        ...r.matches.map((m) => `${m.time} (giống ${m.similarity}): 5/20/60 phiên sau ${pct(m.ret5)} / ${pct(m.ret20)} / ${pct(m.ret60)}`),
        ...horizons.map((k) => {
          const f = r.summary[k];
          return `${k.substring(3)} phiên sau: TB ${pct(f.avg)}, tăng ${f.winRate === null ? "n/a" : Math.round(f.winRate * 100) + "%"} (${f.count} phiên)`;
        }),
        "Trạng thái giống không có nghĩa là kết quả giống.",
      ];
      return textResponse(lines.join("\n"), r);
    } catch (e: any) {
      return errorResponse(`Lỗi khi tìm phiên tương tự ${symbol}: ${message(e)}`);
    }
  }

  return {
    get_quote: handleGetQuote,
    get_history: handleGetHistory,
    search_symbols: handleSearchSymbols,
    list_symbols: handleListSymbols,
    top_movers: handleTopMovers,
    is_trade_day: handleIsTradeDay,
    get_trading_calendar: handleGetTradingCalendar,
    get_company_info: handleGetCompanyInfo,
    get_dividends: handleGetDividends,
    get_corporate_events: handleGetCorporateEvents,
    get_ai_context: handleGetAIContext,
    to_ai_prompt: handleToAIPrompt,
    compare_symbols: handleCompareSymbols,
    get_market_breadth: handleGetMarketBreadth,
    get_foreign_flow: handleGetForeignFlow,
    get_market_context: handleGetMarketContext,
    get_news: handleGetNews,
    get_financials: handleGetFinancials,
    screen_stocks: handleScreenStocks,
    get_gold_price: handleGetGoldPrice,
    get_exchange_rate: handleGetExchangeRate,
    watchlist: handleWatchlist,
    find_patterns: handleFindPatterns,
    get_foreign_history: handleGetForeignHistory,
    portfolio_summary: handlePortfolioSummary,
    backtest_signal: handleBacktestSignal,
    find_similar_setups: handleFindSimilarSetups,
  };
}
