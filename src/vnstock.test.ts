import { Vnstock } from "./vnstock";

const symbols = ["MBB", "TCH"];

describe("VCI", () => {
  test("VCI Trading", async () => {
    const { stock } = new Vnstock();
    const result = await stock.trading.priceBoard(symbols);
    expect(result).toHaveLength(symbols.length);
  });

  test("VCI Quote history", async () => {
    const { stock } = new Vnstock();
    const result = await stock.quote.history({ start: "2024-12-01", symbols });
    expect(result).toHaveLength(2);
  });

  test("VCI Listing allSymbols", async () => {
    const { stock } = new Vnstock();
    const result = await stock.listing.allSymbols();
    expect(result).toBeDefined();
  });

  test("VCI Listing symbolsByExchange", async () => {
    const { stock } = new Vnstock();
    const result = await stock.listing.symbolsByExchange();
    expect(result).toBeDefined();
  });

  test("VCI Listing symbolsByIndustries", async () => {
    const { stock } = new Vnstock();
    const result = await stock.listing.symbolsByIndustries();
    expect(result).toBeDefined();
  });

  test("VCI Listing industriesIcb", async () => {
    const { stock } = new Vnstock();
    const result = await stock.listing.industriesIcb();
    expect(result).toBeDefined();
  });

  test("VCI Listing symbolsByGroup", async () => {
    const { stock } = new Vnstock();
    const result = await stock.listing.symbolsByGroup({});
    expect(result).toBeDefined();
  });

  test("VCI Financials balanceSheet", async () => {
    const { stock } = new Vnstock();
    const result = await stock.financials.balanceSheet({ symbol: symbols[0] });
    expect(result).toBeDefined();
  });

  test("VCI Financials incomeStatement", async () => {
    const { stock } = new Vnstock();
    const result = await stock.financials.incomeStatement({ symbol: symbols[0] });
    expect(result).toBeDefined();
  });

  test("VCI Financials cashFlow", async () => {
    const { stock } = new Vnstock();
    const result = await stock.financials.cashFlow({ symbol: symbols[0] });
    expect(result).toBeDefined();
  });
});

describe("Commodity", () => {
  test("Gold Price", async () => {
    const { commodity } = new Vnstock();
    const result = await commodity.goldPrice();
    expect(result).not.toBeNull();
  });

  test("Gold Price V2", async () => {
    const { commodity } = new Vnstock();
    const result = await commodity.goldPriceV2();
    expect(result).not.toBeNull();
  });

  test("VCB Exchange Rates", async () => {
    const { commodity } = new Vnstock();
    const result = await commodity.exchangeRates();
    expect(result).not.toBeNull();
  });
});
