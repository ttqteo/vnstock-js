import { VciAdapter } from "../../src/adapters/vci";
import { createTransport } from "../../src/transport";
import { createClient } from "../../src/client";
import { tolerateUpstream } from "../helpers/upstream";

// Live VCI calls, run with INTEGRATION=1.
const RUN_INTEGRATION = process.env.INTEGRATION === "1";
const describeIntegration = RUN_INTEGRATION ? describe : describe.skip;

describeIntegration("Listing (integration, INTEGRATION=1)", () => {
  const source = new VciAdapter({ transport: createTransport() });

  it("should return symbols by exchange", async () => {
    const data = await tolerateUpstream(() => source.fetchSymbolsByExchange());
    if (!data) return;
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("symbol");
    expect(data[0]).toHaveProperty("exchange");
    expect(data[0]).toHaveProperty("companyName");
    expect(data[0]).not.toHaveProperty("board");
    expect(data[0]).not.toHaveProperty("organName");
  }, 60000);

  it("should return symbols by industries", async () => {
    const data = await tolerateUpstream(() => source.fetchSymbolsByIndustries());
    if (!data) return;
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("symbol");
    expect(data[0]).toHaveProperty("industry");
  }, 60000);

  it("should return ICB industries", async () => {
    const data = await tolerateUpstream(() => source.fetchIndustriesIcb());
    if (!data) return;
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("code");
    expect(data[0]).toHaveProperty("name");
  }, 60000);

  it("should return symbols by group VN30", async () => {
    const data = await tolerateUpstream(() => source.fetchSymbolsByGroup("VN30"));
    if (!data) return;
    expect(data.length).toBe(30);
  }, 60000);

  it("should serve the client symbol list with HSX read as HOSE", async () => {
    const data = await tolerateUpstream(() => createClient().symbols({ exchange: "HSX" }));
    if (!data) return;
    expect(data.length).toBeGreaterThan(300);
  }, 60000);
});
