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
    expect(accessPresentation({ paid: true, usableCount: 0 }).label).toBe("Paid");
    expect(
      accessPresentation({
        paid: true,
        usableCount: 2,
        products: [{ productId: "p1", productName: "SSC CGL Pack" }],
      }).label
    ).toBe("SSC CGL Pack");
    expect(
      accessPresentation({
        paid: true,
        usableCount: 3,
        products: [
          { productId: "p1", productName: "SSC CGL Pack" },
          { productId: "p2", productName: "RRB NTPC Pack" },
          { productId: "p3", productName: "UPSC Prelims Pack" },
        ],
      })
    ).toMatchObject({
      label: "SSC CGL Pack",
      extraCount: 2,
    });
    expect(badgeTierLabel("gold")).toBe("Badge · Gold");
    expect(badgeTierLabel(undefined)).toBe("Badge · No tier");
  });
});
