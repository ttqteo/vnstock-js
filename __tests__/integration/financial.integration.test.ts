import { createClient } from "../../src/client";
import { tolerateUpstream } from "../helpers/upstream";

// Live VCI calls, run with INTEGRATION=1.
const RUN_INTEGRATION = process.env.INTEGRATION === "1";
const describeIntegration = RUN_INTEGRATION ? describe : describe.skip;

describeIntegration("Financial (integration, INTEGRATION=1)", () => {
  const fpt = createClient().stock("FPT");

  it.each(["balance", "income", "cashflow"] as const)(
    "should return the %s statement in dong",
    async (kind) => {
      const st = await tolerateUpstream(() => fpt.financials(kind, { period: "year" }));
      if (!st) return;
      expect(st.unit).toBe("VND");
      expect(st.rows.length).toBeGreaterThan(0);
      expect(st.fields.length).toBeGreaterThan(0);
    },
    60000
  );

  it("should put FPT annual revenue at the scale of tens of trillions of dong", async () => {
    const st = await tolerateUpstream(() => fpt.financials("income", { period: "year" }));
    if (!st) return;
    const revenue = st.rows[st.rows.length - 1].values.isa1 as number;
    expect(revenue).toBeGreaterThan(3e13);
    expect(revenue).toBeLessThan(3e14);
  }, 60000);
});
