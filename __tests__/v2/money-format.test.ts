import { money, price } from "../../src/cli/format/money";

describe("money format", () => {
  it("formats dong for humans", () => {
    expect(price(125800)).toBe("125.8k");
    expect(money(392496000000)).toBe("392.5 tỷ");
    expect(money(19197237000000)).toBe("19.2 nghìn tỷ");
    expect(money(-507100000000)).toBe("-507.1 tỷ");
    expect(money(8500000)).toBe("8.5 triệu");
  });

  it("keeps price ticks below 10k and whole thousands", () => {
    expect(price(12350)).toBe("12.35k");
    expect(price(9850)).toBe("9.85k");
    expect(price(60000)).toBe("60k");
    expect(price(0)).toBe("0k");
  });

  it("prints small amounts as plain dong", () => {
    expect(money(950000)).toBe("950000");
    expect(money(0)).toBe("0");
  });
});
