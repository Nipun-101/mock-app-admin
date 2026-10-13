import { describe, expect, it } from "vitest";
import { accessPresentation, badgeTierLabel, tierStyle } from "./constants";

describe("user card visual tokens", () => {
  it("maps known badge tiers", () => {
    expect(tierStyle("gold").label).toBe("Gold");
    expect(tierStyle("gold").color).toMatch(/^#/);
  });

  it("falls back for unknown or missing badge tiers", () => {
    expect(tierStyle(undefined).label).toBe("No tier");
    expect(tierStyle("diamond").label).toBe("No tier");
  });

  it("shows paid access from usable entitlements and free when access is missing", () => {
    expect(accessPresentation(undefined).label).toBe("Free");
    expect(accessPresentation({ paid: false, usableCount: 0 }).label).toBe("Free");
    expect(accessPresentation({ paid: true, usableCount: 2 }).label).toBe("Paid · 2");
    expect(accessPresentation({ paid: true, usableCount: 0 }).label).toBe("Paid");
    expect(badgeTierLabel("gold")).toBe("Badge · Gold");
    expect(badgeTierLabel(undefined)).toBe("Badge · No tier");
  });
});
