import { Vnstock } from "../../runtime";
import { init } from "../../data";
import { Directory } from "../../core/listing/directory";
import { calendar } from "../../core/market";
import { textResponse, errorResponse, McpToolResponse } from "./formatters";
import { TTLCache, QUOTE_TTL_MS, AI_CONTEXT_TTL_MS } from "./cache";

var initialized = false;
async function ensureData() {
  if (initialized) return;
  await init();
  initialized = true;
}

const vnstock = new Vnstock();
const quoteCache = new TTLCache<any>(QUOTE_TTL_MS);
const aiCache = new TTLCache<any>(AI_CONTEXT_TTL_MS);

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
    var summary = `${symbol} từ ${from} đến ${to} — ${sliced.length} phiên`;
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
    var summary = `${symbol} — ${info.companyName} · ${info.exchange}`;
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
    var summary = `${symbol} — ${dividends.length} sự kiện cổ tức`;
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
    var summary = `${symbol} — ${events.length} sự kiện doanh nghiệp`;
    return textResponse(summary, events);
  } catch (e: any) {
    return errorResponse(`Lỗi khi lấy sự kiện ${symbol}: ${e.message || e}`);
  }
}

export async function handleGetAIContext(args: any): Promise<McpToolResponse> {
  var symbol = String(args.symbol || "").toUpperCase().trim();
  if (!symbol) return errorResponse("Thiếu tham số 'symbol'.");
  var lookback = typeof args.lookback === "number" ? args.lookback : 200;
  var key = symbol + "|" + lookback;
  var cached = aiCache.get(key);
  if (cached) {
    return textResponse(`AI context cho ${symbol} (cached)`, cached);
  }
  try {
    var ctx = await vnstock.stock.aiContext(symbol, { lookback });
    aiCache.set(key, ctx);
    var summary = `${symbol} — trend ${ctx.trend.direction} (${(ctx.trend.strength * 100).toFixed(0)}%)`;
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
    var text = await vnstock.stock.toAIPrompt(symbol, { lang });
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
};
