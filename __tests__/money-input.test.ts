import { describe, expect, it } from "vitest";
import { formatMoneyInput, parseMoneyInput } from "../lib/money-input";

describe("money input helpers", () => {
  it("them dau cham ngan cach hang nghin khi nhap tien", () => {
    expect(formatMoneyInput("450000")).toBe("450.000");
    expect(formatMoneyInput("1.250.000")).toBe("1.250.000");
    expect(formatMoneyInput("abc90.000d")).toBe("90.000");
  });

  it("parse so tien da format ve number dung", () => {
    expect(parseMoneyInput("90.000")).toBe(90_000);
    expect(parseMoneyInput("450000")).toBe(450_000);
    expect(parseMoneyInput("")).toBeNull();
  });
});
