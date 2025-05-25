import { Vnstock } from "../src/runtime";
import { saveTestOutput } from "./utils/testOutput";

describe("Commodity Data", () => {
  let vnstock: Vnstock;

  beforeEach(() => {
    vnstock = new Vnstock();
  });

  test("should fetch gold price data", async () => {
    const result = await vnstock.commodity.goldPrice();
    saveTestOutput("gold-price-v1", result);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
  });

  test("should fetch gold price data (V2)", async () => {
    const result = await vnstock.commodity.goldPriceV2();
    saveTestOutput("gold-price-v2", result);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
  });

  test("should fetch gold price data (SJC)", async () => {
    const result = await vnstock.commodity.goldPriceSJC();
    saveTestOutput("gold-price-sjc", result);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
  });

  test("should fetch VCB exchange rates", async () => {
    const result = await vnstock.commodity.exchangeRates();
    saveTestOutput("exchange-rates", result);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
  });
});
