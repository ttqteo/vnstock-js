import { handleQuote } from "../../src/cli/commands/quote";

const sample = {
  symbol: "VCB",
  name: "Vietcombank",
  nameEn: "Vietcombank",
  exchange: "HOSE",
  price: 59300,
  change: 100,
  changePct: 0.169,
  ref: 59200,
  ceiling: 63300,
  floor: 55100,
  high: 59400,
  low: 59100,
  avg: 59250,
  volume: 3_830_000,
  value: 227e9,
  foreignBuyVolume: 1_410_000,
  foreignSellVolume: 656_300,
  bids: [],
  asks: [],
};

const base = { json: false, csv: false, color: false, quiet: true, verbose: false };

function fakeClient(result: any[] = [sample]) {
  const prices = jest.fn(async (_s: string[]) => result);
  return { client: { prices } as any, prices };
}

describe("handleQuote", () => {
  it("returns JSON when --json", async () => {
    const { client } = fakeClient();
    expect(JSON.parse(await handleQuote(client, { symbol: "VCB", ...base, json: true })).price).toBe(59300);
  });

  it("returns CSV when --csv", async () => {
    const { client } = fakeClient();
    expect((await handleQuote(client, { symbol: "VCB", ...base, csv: true })).split("\n")[0]).toContain("symbol");
  });

  it("prints symbol, company, exchange and the price from dong", async () => {
    const { client } = fakeClient();
    const out = await handleQuote(client, { symbol: "VCB", ...base });
    expect(out).toContain("VCB");
    expect(out).toContain("Vietcombank");
    expect(out).toContain("HOSE");
    expect(out).toContain("59.3k");
    expect(out).toContain("+0.17%");
    expect(out).toContain("63.3k/55.1k");
  });

  it("verbose adds foreign volume and high/low", async () => {
    const { client } = fakeClient();
    const out = await handleQuote(client, { symbol: "VCB", ...base, verbose: true });
    expect(out).toContain("NN Mua/Bán");
    expect(out).toContain("59.4k/59.1k");
  });

  it("asks for uppercase symbols, comma separated", async () => {
    const { client, prices } = fakeClient();
    await handleQuote(client, { symbol: "vcb, fpt", ...base, json: true });
    expect(prices).toHaveBeenCalledWith(["VCB", "FPT"]);
  });

  it("throws when nothing comes back", async () => {
    const { client } = fakeClient([]);
    await expect(handleQuote(client, { symbol: "XYZ", ...base })).rejects.toThrow(/not found/);
  });
});
