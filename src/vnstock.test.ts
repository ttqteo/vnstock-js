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

  test("VCI Listing all symbols", async () => {
    const { stock } = new Vnstock();
    const result = await stock.listing.allSymbols();
    expect(result).toBeDefined();
  });
});

describe("TCBS", () => {
  test("TCBS Trading", async () => {
    const { stock } = new Vnstock("TCBS");
    const result = await stock.trading.priceBoard(symbols);
    expect(result).toHaveLength(symbols.length);
  });

  test("TCBS Quote history not implemented", async () => {
    const { stock } = new Vnstock("TCBS");
    await expect(stock.quote.history({ start: "2024-12-01", symbols })).rejects.toThrow(Error);
  });

  test("TCBS Listing all symbols not implemented", async () => {
    const { stock } = new Vnstock("TCBS");
    await expect(stock.listing.allSymbols()).rejects.toThrow(Error);
  });
});

describe("Gold", () => {
  test("Gold Price", async () => {
    const { commodity } = new Vnstock();
    const result = await commodity.goldPrice();
    expect(result).not.toBeNull();
  });
});
