import { describe, expect, it } from "vitest";
import { parseEuro, parseHours, parsePercent } from "./format";

describe("parseEuro", () => {
  it("accetta i formati italiani e inglesi", () => {
    expect(parseEuro("1.234,56")).toBe(123456);
    expect(parseEuro("12,5")).toBe(1250);
    expect(parseEuro("€ 30")).toBe(3000);
    expect(parseEuro("19.99")).toBe(1999);
    expect(parseEuro("1.000")).toBe(100000);
    expect(parseEuro("abc")).toBeNull();
  });
});

describe("parseHours", () => {
  it("ore decimali o ore:minuti", () => {
    expect(parseHours("1,5")).toBe(90);
    expect(parseHours("1:30")).toBe(90);
    expect(parseHours("2")).toBe(120);
    expect(parseHours("x")).toBeNull();
  });
});

describe("parsePercent", () => {
  it("percentuali in centesimi di punto", () => {
    expect(parsePercent("22")).toBe(2200);
    expect(parsePercent("33,33%")).toBe(3333);
    expect(parsePercent("120")).toBeNull();
  });
});
