import { Vnstock } from "../src/runtime";
import { saveTestOutput } from "./utils/testOutput";

describe("Commodity Data", () => {
  let vnstock: Vnstock;

  beforeEach(() => {
    vnstock = new Vnstock();
  });

  test("should fetch gold price data (BTMC)", async () => {
    const result = await vnstock.commodity.goldPriceBTMC();
    saveTestOutput("gold-price-btmc", result);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
  });

  test("should fetch gold price data (giavang.net)", async () => {
    const result = await vnstock.commodity.goldPriceGiaVangNet();
    saveTestOutput("gold-price-giavangnet", result);
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
