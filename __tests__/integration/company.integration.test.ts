import { createClient } from "../../src/client";
import { tolerateUpstream } from "../helpers/upstream";

// Live VCI calls, run with INTEGRATION=1.
const RUN_INTEGRATION = process.env.INTEGRATION === "1";
const describeIntegration = RUN_INTEGRATION ? describe : describe.skip;

describeIntegration("Company (integration, INTEGRATION=1)", () => {
  const vci = createClient().stock("VCI");

  it("should return a normalized profile", async () => {
    const data = await tolerateUpstream(() => vci.company());
    if (!data) return;
    expect(data).toHaveProperty("symbol", "VCI");
    expect(data).toHaveProperty("industry");
    expect(data).toHaveProperty("industryEn");
    expect(data).toHaveProperty("issuedShares");
    expect(data).not.toHaveProperty("issueShare");
    expect(data).not.toHaveProperty("icbName3");
  }, 60000);

  it("should return normalized shareholders", async () => {
    const data = await tolerateUpstream(() => vci.shareholders());
    if (!data) return;
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("name");
    expect(data[0]).toHaveProperty("percentage");
    expect(data[0]).not.toHaveProperty("ownerFullName");
    expect(data[0]).not.toHaveProperty("ticker");
  }, 60000);

  it("should return normalized officers", async () => {
    const data = await tolerateUpstream(() => vci.officers());
    if (!data) return;
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("name");
    expect(data[0]).toHaveProperty("position");
  }, 60000);

  it("should return normalized events with ICT dates", async () => {
    const data = await tolerateUpstream(() => vci.events());
    if (!data) return;
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("title");
    if (data[0].publishedAt) expect(String(data[0].publishedAt)).toMatch(/^\d{4}-\d{2}-\d{2}/);
  }, 60000);

  it("should return normalized news", async () => {
    const data = await tolerateUpstream(() => vci.news());
    if (!data) return;
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) expect(data[0]).toHaveProperty("title");
  }, 60000);

  it("should return dividends as a subset of events", async () => {
    const data = await tolerateUpstream(() => vci.dividends());
    if (!data) return;
    for (const e of data) expect(String(e.eventType)).toContain("DIVIDEND");
  }, 60000);
});
