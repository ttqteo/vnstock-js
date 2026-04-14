jest.mock("../../src", () => ({
  __esModule: true,
  default: {
    stock: {
      trading: {
        priceBoard: jest.fn(),
      },
    },
  },
}));

import { handleQuote, meta } from "../../src/cli/commands/quote";
import sdk from "../../src";

const mockPriceBoard = (sdk as any).stock.trading.priceBoard as jest.Mock;

const sample = {
  symbol: "VCB",
  companyName: "Vietcombank",
  exchange: "HSX",
  price: 59.3,
  referencePrice: 59.2,
  ceilingPrice: 63.3,
  floorPrice: 55.3,
  highestPrice: 59.4,
  lowestPrice: 59.1,
  totalVolume: 3_830_000,
  foreignBuyVolume: 1_410_000,
  foreignSellVolume: 656_300,
};

beforeEach(() => {
  mockPriceBoard.mockReset();
  mockPriceBoard.mockResolvedValue([sample]);
});

describe("handleQuote meta", () => {
  it("does not require data init", () => {
    expect(meta.requiresData).toBe(false);
  });
});

describe("handleQuote", () => {
  const base = { json: false, csv: false, color: false, quiet: true, verbose: false };

  it("returns JSON when --json", async () => {
    const out = await handleQuote({ symbol: "VCB", ...base, json: true });
    const parsed = JSON.parse(out);
    expect(parsed.symbol).toBe("VCB");
  });

  it("returns CSV when --csv", async () => {
    const out = await handleQuote({ symbol: "VCB", ...base, csv: true });
    expect(out.split("\n")[0]).toContain("symbol");
    expect(out).toContain("VCB");
  });

  it("default output contains symbol, company, exchange, price", async () => {
    const out = await handleQuote({ symbol: "VCB", ...base });
    expect(out).toContain("VCB");
    expect(out).toContain("Vietcombank");
    expect(out).toContain("HSX");
    expect(out).toContain("59.3");
  });

  it("verbose includes NN and highest/lowest", async () => {
    const out = await handleQuote({ symbol: "VCB", ...base, verbose: true });
    expect(out).toContain("NN");
    expect(out).toContain("Cao");
  });

  it("calls priceBoard with uppercase symbol", async () => {
    await handleQuote({ symbol: "vcb", ...base, json: true });
    expect(mockPriceBoard).toHaveBeenCalledWith(["VCB"]);
  });

  it("throws when symbol not found (empty array)", async () => {
    mockPriceBoard.mockResolvedValue([]);
    await expect(
      handleQuote({ symbol: "ZZZ", ...base, json: true })
    ).rejects.toThrow(/not found/i);
  });
});
