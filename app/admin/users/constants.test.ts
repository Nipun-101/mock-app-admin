import { describe, expect, it } from "vitest";
import { planAccent, planStyle, tierStyle } from "./constants";

describe("user card visual tokens", () => {
  it("maps known plans and tiers", () => {
    expect(planStyle("premium").label).toBe("Premium");
    expect(planStyle("basic").color).toMatch(/^#/);
    expect(tierStyle("gold").label).toBe("Gold");
    expect(planAccent("enterprise")).toBe("#d48806");
  });

  it("falls back for unknown or missing values", () => {
    expect(planStyle(undefined).label).toBe("Free");
    expect(planStyle("vip").label).toBe("Free");
    expect(tierStyle(undefined).label).toBe("No tier");
    expect(tierStyle("diamond").label).toBe("No tier");
    expect(planAccent(undefined)).toBe("#8c8c8c");
    expect(planAccent("vip")).toBe("#8c8c8c");
  });
});
