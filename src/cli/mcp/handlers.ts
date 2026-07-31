import { Vnstock } from "../../runtime";
import { init } from "../../data";
import { Directory } from "../../core/listing/directory";
import { calendar } from "../../core/market";
import { textResponse, errorResponse, McpToolResponse } from "./formatters";
import { TTLCache, QUOTE_TTL_MS, AI_CONTEXT_TTL_MS } from "./cache";
import { Watchlist } from "../../watchlist";

var initialized = false;
async function ensureData() {
  if (initialized) return;
  await init();
  initialized = true;
}

const vnstock = new Vnstock();
const quoteCache = new TTLCache<any>(QUOTE_TTL_MS);
const aiCache = new TTLCache<any>(AI_CONTEXT_TTL_MS);
const watchlist = new Watchlist();

function todayISO(): string {
  return new Date().toISOString().substring(0, 10);
}

function daysAgoISO(days: number): string {
  var d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().substring(0, 10);
}

export async function handleGetQuote(args: any): Promise<McpToolResponse> {
  var symbol = String(args.symbol || "").toUpperCase().trim();
  if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");
  var cached = quoteCache.get(symbol);
  if (cached) return formatQuote(symbol, cached);
  try {
    var list = await vnstock.stock.trading.priceBoard([symbol]);
    if (list.length === 0) {
      return errorResponse(`Không tìm thấy mã "${symbol}". Hãy thử search_symbols với tên công ty.`);
    }
    quoteCache.set(symbol, list[0]);
    return formatQuote(symbol, list[0]);
  } catch (e: any) {
    return errorResponse(`Lỗi khi lấy giá ${symbol}: ${e.message || e}`);
  }
}

function formatQuote(symbol: string, pb: any): McpToolResponse {
  var change = pb.percentPriceChange != null ? (pb.percentPriceChange * 100).toFixed(2) + "%" : "n/a";
  var sign = pb.percentPriceChange > 0 ? "+" : "";
  var summary = `${symbol} ${pb.companyName || ""}\n` +
    `Giá: ${pb.price}k  (${sign}${change})  KL: ${pb.totalVolume?.toLocaleString() || 0}\n` +
    `Trần/Sàn: ${pb.ceilingPrice}k / ${pb.floorPrice}k  Tham chiếu: ${pb.referencePrice}k`;
  return textResponse(summary, pb);
}

export async function handleGetHistory(args: any): Promise<McpToolResponse> {
  var symbol = String(args.symbol || "").toUpperCase().trim();
  if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");
  var from = args.from || daysAgoISO(30);
  var to = args.to || todayISO();
  var limit = typeof args.limit === "number" ? args.limit : 30;
  try {
    var rows = await vnstock.stock.quote.history({
      symbols: [symbol],
      start: from,
      end: to,
      timeFrame: "1D",
    });
    var sliced = rows.slice(-limit);
    var summary = `${symbol} từ ${from} đến ${to}: ${sliced.length} phiên`;
    return textResponse(summary, sliced);
  } catch (e: any) {
    return errorResponse(`Lỗi khi lấy lịch sử ${symbol}: ${e.message || e}`);
  }
}

export async function handleSearchSymbols(args: any): Promise<McpToolResponse> {
  var query = String(args.query || "").trim();
  if (!query) return errorResponse("Thiếu tham số 'query'.");
  var limit = typeof args.limit === "number" ? args.limit : 10;
  try {
    await ensureData();
    var results = Directory.search(query, { limit });
    var summary = `Tìm thấy ${results.length} kết quả cho "${query}"`;
    return textResponse(summary, results);
  } catch (e: any) {
    return errorResponse(`Lỗi khi tìm kiếm: ${e.message || e}`);
  }
}

export async function handleListSymbols(args: any): Promise<McpToolResponse> {
  var exchange = args.exchange ? String(args.exchange).toUpperCase() : null;
  var limit = typeof args.limit === "number" ? args.limit : undefined;
  try {
    await ensureData();
    var list = exchange ? Directory.getByExchange(exchange) : Directory.search("", { limit: 10000 });
    if (limit) list = list.slice(0, limit);
    var summary = exchange
      ? `Sàn ${exchange}: ${list.length} mã`
      : `Tổng: ${list.length} mã`;
    return textResponse(summary, list);
  } catch (e: any) {
    return errorResponse(`Lỗi khi liệt kê mã: ${e.message || e}`);
  }
}

export async function handleTopMovers(args: any): Promise<McpToolResponse> {
  var limit = typeof args.limit === "number" ? args.limit : 10;
  try {
    var pair = await Promise.all([
      vnstock.stock.trading.topGainers(),
      vnstock.stock.trading.topLosers(),
    ]);
    var gainers = pair[0].slice(0, limit);
    var losers = pair[1].slice(0, limit);
    var summary = `Top ${limit} tăng + ${limit} giảm hôm nay`;
    return textResponse(summary, { gainers, losers });
  } catch (e: any) {
    return errorResponse(`Lỗi: ${e.message || e}`);
  }
}

export async function handleIsTradeDay(args: any): Promise<McpToolResponse> {
  var date = args.date || todayISO();
  try {
    await ensureData();
    var isTrade = calendar.isTradeDay(date);
    return textResponse(
      `Ngày ${date}: ${isTrade ? "có giao dịch" : "không có giao dịch (nghỉ lễ hoặc cuối tuần)"}`,
      { date, isTradeDay: isTrade }
    );
  } catch (e: any) {
    return errorResponse(`Lỗi: ${e.message || e}`);
  }
}

export async function handleGetTradingCalendar(args: any): Promise<McpToolResponse> {
  var year = Number(args.year);
  if (!year || year < 1900) return errorResponse("Thiếu hoặc invalid 'year'.");
  try {
    await ensureData();
    var holidays = calendar.holidays(year);
    return textResponse(
      `Năm ${year}: ${holidays.length} ngày nghỉ lễ TTCK`,
      { year, holidays }
    );
  } catch (e: any) {
    return errorResponse(`Lỗi: ${e.message || e}`);
  }
}

export async function handleGetCompanyInfo(args: any): Promise<McpToolResponse> {
  var symbol = String(args.symbol || "").toUpperCase().trim();
  if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");
  try {
    await ensureData();
    var info = Directory.getBySymbol(symbol);
    if (!info) {
      return errorResponse(`Không tìm thấy mã "${symbol}". Hãy thử search_symbols.`);
    }
    var summary = `${symbol}: ${info.companyName} · ${info.exchange}`;
    return textResponse(summary, info);
  } catch (e: any) {
    return errorResponse(`Lỗi: ${e.message || e}`);
  }
}

export async function handleGetDividends(args: any): Promise<McpToolResponse> {
  var symbol = String(args.symbol || "").toUpperCase().trim();
  if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");
  try {
    var dividends = await vnstock.stock.company(symbol).dividends();
    var summary = `${symbol}: ${dividends.length} sự kiện cổ tức`;
    return textResponse(summary, dividends);
  } catch (e: any) {
    return errorResponse(`Lỗi khi lấy cổ tức ${symbol}: ${e.message || e}`);
  }
}

export async function handleGetCorporateEvents(args: any): Promise<McpToolResponse> {
  var symbol = String(args.symbol || "").toUpperCase().trim();
  if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");
  try {
    var events = await vnstock.stock.company(symbol).events();
    var summary = `${symbol}: ${events.length} sự kiện doanh nghiệp`;
    return textResponse(summary, events);
  } catch (e: any) {
    return errorResponse(`Lỗi khi lấy sự kiện ${symbol}: ${e.message || e}`);
  }
}

export async function handleGetAIContext(args: any): Promise<McpToolResponse> {
  var symbol = String(args.symbol || "").toUpperCase().trim();
  if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");
  var lookback = typeof args.lookback === "number" ? args.lookback : 200;
  var asOf = args.as_of ? String(args.as_of) : undefined;
  // asOf is part of the cache key: the same symbol at two different dates is
  // two different answers.
  var key = symbol + "|" + lookback + "|" + (asOf || "latest");
  var cached = aiCache.get(key);
  if (cached) {
    return textResponse(`AI context cho ${symbol} (cached)`, cached);
  }
  try {
    var ctx = await vnstock.stock.aiContext(symbol, { lookback, asOf });
    aiCache.set(key, ctx);
    var summary = `${symbol}: trend ${ctx.trend.direction} (${(ctx.trend.strength * 100).toFixed(0)}%)`;
    return textResponse(summary, ctx);
  } catch (e: any) {
    return errorResponse(`Lỗi khi build AI context ${symbol}: ${e.message || e}`);
  }
}

export async function handleToAIPrompt(args: any): Promise<McpToolResponse> {
  var symbol = String(args.symbol || "").toUpperCase().trim();
  if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");
  var lang: "vi" | "en" = args.lang === "en" ? "en" : "vi";
  try {
    var text = await vnstock.stock.toAIPrompt(symbol, {
      lang,
      asOf: args.as_of ? String(args.as_of) : undefined,
    });
    return textResponse(text);
  } catch (e: any) {
    return errorResponse(`Lỗi: ${e.message || e}`);
  }
}

export async function handleCompareSymbols(args: any): Promise<McpToolResponse> {
  var symbols = Array.isArray(args.symbols) ? args.symbols : [];
  if (symbols.length < 2) return errorResponse("Cần ≥2 mã để so sánh.");
  if (symbols.length > 10) return errorResponse("Tối đa 10 mã.");
  try {
    var upperSymbols = symbols.map((s: any) => String(s).toUpperCase());
    var list = await vnstock.stock.trading.priceBoard(upperSymbols);
    var summary = `So sánh ${list.length} mã: ${upperSymbols.join(", ")}`;
    return textResponse(summary, list);
  } catch (e: any) {
    return errorResponse(`Lỗi: ${e.message || e}`);
  }
}

type ExchangeArg = "HOSE" | "HNX" | "UPCOM" | "ALL";
const EXCHANGE_ARGS: ExchangeArg[] = ["HOSE", "HNX", "UPCOM", "ALL"];

function parseExchange(raw: any): ExchangeArg | null {
  if (raw === undefined || raw === null || raw === "") return "HOSE";
  var up = String(raw).toUpperCase().trim();
  if (up === "HSX") up = "HOSE";
  return EXCHANGE_ARGS.indexOf(up as ExchangeArg) === -1 ? null : (up as ExchangeArg);
}

export async function handleGetMarketBreadth(args: any): Promise<McpToolResponse> {
  var exchange = parseExchange(args.exchange);
  if (!exchange) return errorResponse(`Sàn không hợp lệ. Chọn: ${EXCHANGE_ARGS.join(", ")}.`);
  try {
    var b = await vnstock.market.breadth({ exchange });
    var summary =
      `${b.exchange} ${b.date}: tăng ${b.advancing}, giảm ${b.declining}, đứng giá ${b.unchanged}` +
      ` (trần ${b.ceiling}, sàn ${b.floor}) trên ${b.total} mã có giao dịch`;
    return textResponse(summary, b);
  } catch (e: any) {
    return errorResponse(`Lỗi khi lấy độ rộng thị trường: ${e.message || e}`);
  }
}

export async function handleGetForeignFlow(args: any): Promise<McpToolResponse> {
  var symbol = args.symbol ? String(args.symbol).toUpperCase().trim() : "";
  try {
    if (symbol) {
      var one = await vnstock.stock.foreignFlow(symbol);
      var verb = one.netValue >= 0 ? "mua ròng" : "bán ròng";
      return textResponse(
        `${one.symbol} ${one.date}: khối ngoại ${verb} ${Math.abs(one.netValue)} tỷ VND`,
        one
      );
    }

    var exchange = parseExchange(args.exchange);
    if (!exchange) return errorResponse(`Sàn không hợp lệ. Chọn: ${EXCHANGE_ARGS.join(", ")}.`);
    var top = typeof args.top === "number" ? args.top : 10;
    var flow = await vnstock.market.foreignFlow({ exchange, top });
    var side = flow.netValue >= 0 ? "mua ròng" : "bán ròng";
    var summary =
      `${flow.exchange} ${flow.date}: khối ngoại ${side} ${Math.abs(flow.netValue)} tỷ VND ` +
      `(mua ${flow.buyValue}, bán ${flow.sellValue})`;
    return textResponse(summary, flow);
  } catch (e: any) {
    return errorResponse(`Lỗi khi lấy dữ liệu khối ngoại: ${e.message || e}`);
  }
}

export async function handleGetMarketContext(args: any): Promise<McpToolResponse> {
  var exchange = parseExchange(args.exchange);
  if (!exchange) return errorResponse(`Sàn không hợp lệ. Chọn: ${EXCHANGE_ARGS.join(", ")}.`);
  try {
    var ctx = await vnstock.market.aiContext({
      exchange,
      index: args.index ? String(args.index) : undefined,
      asOf: args.as_of ? String(args.as_of) : undefined,
    });
    var summary =
      `${ctx.index.symbol} ${ctx.date}: ${ctx.index.close} điểm ` +
      `(${ctx.index.changePercent === null ? "n/a" : ctx.index.changePercent + "%"}), ` +
      `regime ${ctx.regime}, thanh khoản ${ctx.liquidity.value} tỷ (${ctx.liquidity.signal})`;
    return textResponse(summary, ctx);
  } catch (e: any) {
    return errorResponse(`Lỗi khi build bối cảnh thị trường: ${e.message || e}`);
  }
}

export async function handleGetNews(args: any): Promise<McpToolResponse> {
  var date = args.date ? String(args.date) : undefined;
  var limit = typeof args.limit === "number" ? args.limit : 20;
  try {
    var items;
    if (args.keyword) {
      items = await vnstock.news.search(String(args.keyword), date);
    } else if (args.source) {
      items = await vnstock.news.bySource(String(args.source), date);
    } else {
      items = await vnstock.news.byDate(date);
    }
    var sliced = items.slice(0, limit);
    var filter = args.keyword
      ? ` khớp "${args.keyword}"`
      : args.source
        ? ` từ ${args.source}`
        : "";
    if (sliced.length === 0) {
      return textResponse(`Không có tin${filter} cho ngày ${date || "hôm nay"}.`, []);
    }
    return textResponse(`${sliced.length} tin${filter} ngày ${date || "hôm nay"}`, sliced);
  } catch (e: any) {
    return errorResponse(`Lỗi khi lấy tin tức: ${e.message || e}`);
  }
}

const REPORTS: Record<string, "balanceSheet" | "incomeStatement" | "cashFlow"> = {
  balance_sheet: "balanceSheet",
  income_statement: "incomeStatement",
  cash_flow: "cashFlow",
};

export async function handleGetFinancials(args: any): Promise<McpToolResponse> {
  var symbol = String(args.symbol || "").toUpperCase().trim();
  if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");

  var reportArg = String(args.report || "balance_sheet").toLowerCase();
  var method = REPORTS[reportArg];
  if (!method) {
    return errorResponse(`Loại báo cáo không hợp lệ. Chọn: ${Object.keys(REPORTS).join(", ")}.`);
  }
  var period = args.period === "year" ? "year" : "quarter";

  try {
    var result = await vnstock.stock.financials[method]({ symbol, period });
    return textResponse(`${symbol}: ${reportArg} theo ${period}`, result);
  } catch (e: any) {
    return errorResponse(`Lỗi khi lấy báo cáo tài chính ${symbol}: ${e.message || e}`);
  }
}

export async function handleScreenStocks(args: any): Promise<McpToolResponse> {
  var group = args.group ? String(args.group).toUpperCase() : undefined;
  var exchange = args.exchange ? String(args.exchange).toUpperCase() : undefined;
  if (!group && !exchange) {
    return errorResponse(
      "Cần chỉ định phạm vi: 'group' (VN30, HNX30...) hoặc 'exchange' (HOSE, HNX, UPCOM). " +
        "Chỉ số tài chính phải lấy theo từng mã nên không quét cả thị trường trong một lần."
    );
  }

  var filters = Array.isArray(args.filters) ? args.filters : [];
  for (var i = 0; i < filters.length; i++) {
    var f = filters[i];
    if (!f || !f.field || !f.operator || f.value === undefined) {
      return errorResponse("Mỗi filter cần đủ 'field', 'operator' và 'value'.");
    }
  }

  try {
    var rows = await vnstock.stock.screening.screen({
      group: group,
      exchange: exchange,
      filters: filters,
      sortBy: args.sort_by ? String(args.sort_by) : undefined,
      order: args.order === "asc" ? "asc" : "desc",
      limit: typeof args.limit === "number" ? args.limit : 20,
    });
    return textResponse(`${group || exchange}: ${rows.length} mã khớp điều kiện`, rows);
  } catch (e: any) {
    return errorResponse(`Lỗi khi sàng lọc: ${e.message || e}`);
  }
}

export async function handleGetGoldPrice(args: any): Promise<McpToolResponse> {
  var source = args.source ? String(args.source).toLowerCase() : "auto";
  if (["auto", "btmc", "giavangnet"].indexOf(source) === -1) {
    return errorResponse("Nguồn không hợp lệ. Chọn: auto, btmc, giavangnet.");
  }
  try {
    var result = await vnstock.commodity.goldPrice({ source: source as any });
    return textResponse(`Giá vàng từ ${result.source}: ${result.data.length} loại`, result.data);
  } catch (e: any) {
    return errorResponse(`Lỗi khi lấy giá vàng: ${e.message || e}`);
  }
}

export async function handleGetExchangeRate(args: any): Promise<McpToolResponse> {
  try {
    var rates: any[] = await vnstock.commodity.exchangeRates(
      args.date ? String(args.date) : undefined
    );
    if (args.currency) {
      var want = String(args.currency).toUpperCase();
      rates = rates.filter(function (r: any) {
        return String(r.currencyCode || "").toUpperCase() === want;
      });
      if (rates.length === 0) {
        return errorResponse(`Không tìm thấy tỷ giá cho "${args.currency}".`);
      }
    }
    return textResponse(`Tỷ giá Vietcombank: ${rates.length} loại tiền`, rates);
  } catch (e: any) {
    return errorResponse(`Lỗi khi lấy tỷ giá: ${e.message || e}`);
  }
}

export async function handleWatchlist(args: any): Promise<McpToolResponse> {
  var action = String(args.action || "").toLowerCase().trim();
  var name = args.name ? String(args.name) : "";
  var symbols: string[] = Array.isArray(args.symbols)
    ? args.symbols.map(function (s: any) {
        return String(s).toUpperCase();
      })
    : [];

  // Every action except list_all operates on one named list.
  if (action !== "list_all" && !name) {
    return errorResponse("Thiếu tham số 'name'.");
  }

  try {
    switch (action) {
      case "list_all": {
        var all = await watchlist.listAll();
        return textResponse(`${all.length} danh sách theo dõi`, all);
      }
      case "list": {
        var items = await watchlist.list(name);
        return textResponse(`${name}: ${items.length} mã`, items);
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
        for (var i = 0; i < symbols.length; i++) {
          await watchlist.remove(name, symbols[i]);
        }
        return textResponse(`Đã bỏ ${symbols.join(", ")} khỏi "${name}".`, await watchlist.list(name));
      }
      case "quote": {
        var list = await watchlist.list(name);
        if (list.length === 0) return textResponse(`Danh sách "${name}" đang trống.`, []);
        var board = await vnstock.stock.trading.priceBoard(list);
        return textResponse(`${name}: giá ${board.length} mã`, board);
      }
      default:
        return errorResponse(
          "Hành động không hợp lệ. Chọn: list_all, list, create, delete, add, remove, quote."
        );
    }
  } catch (e: any) {
    return errorResponse(`Lỗi watchlist: ${e.message || e}`);
  }
}

export const handlers: Record<string, (args: any) => Promise<McpToolResponse>> = {
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
};
