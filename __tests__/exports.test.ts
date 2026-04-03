import vnstock, {
  stock,
  commodity,
  realtime,
  Vnstock,
  RealtimeClient,
  VnstockTypes,
  VnstockError,
  NetworkError,
  RateLimitError,
  ApiError,
  InvalidSymbolError,
  InvalidParameterError,
  ParseError,
  sma,
  ema,
  rsi,
} from "../src";

describe("Public API exports", () => {
  it("exports default vnstock instance", () => {
    expect(vnstock).toBeDefined();
    expect(vnstock.stock).toBeDefined();
    expect(vnstock.commodity).toBeDefined();
  });

  it("exports simplified stock API", () => {
    expect(stock.quote).toBeInstanceOf(Function);
    expect(stock.priceBoard).toBeInstanceOf(Function);
    expect(stock.topGainers).toBeInstanceOf(Function);
    expect(stock.topLosers).toBeInstanceOf(Function);
    expect(stock.company).toBeInstanceOf(Function);
    expect(stock.financials).toBeInstanceOf(Function);
    expect(stock.screening).toBeInstanceOf(Function);
  });

  it("exports simplified commodity API", () => {
    expect(commodity.gold.priceBTMC).toBeInstanceOf(Function);
    expect(commodity.gold.priceSJC).toBeInstanceOf(Function);
    expect(commodity.exchange).toBeInstanceOf(Function);
  });

  it("exports realtime v2", () => {
    expect(realtime.create).toBeInstanceOf(Function);
    expect(realtime.parseData).toBeInstanceOf(Function);
    expect(RealtimeClient).toBeDefined();
  });

  it("exports error classes", () => {
    expect(VnstockError).toBeDefined();
    expect(NetworkError).toBeDefined();
    expect(RateLimitError).toBeDefined();
    expect(ApiError).toBeDefined();
    expect(InvalidSymbolError).toBeDefined();
    expect(InvalidParameterError).toBeDefined();
    expect(ParseError).toBeDefined();
  });

  it("exports Vnstock class", () => {
    const instance = new Vnstock();
    expect(instance.stock).toBeDefined();
    expect(instance.commodity).toBeDefined();
  });

  it("exports indicators", () => {
    expect(sma).toBeInstanceOf(Function);
    expect(ema).toBeInstanceOf(Function);
    expect(rsi).toBeInstanceOf(Function);
  });

  it("exports normalized types namespace", () => {
    expect(VnstockTypes).toBeDefined();
  });
});
