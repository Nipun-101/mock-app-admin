import { describe, expect, it } from "vitest";
import {
  formatPaiseAsRupees,
  paiseToRupees,
  rupeesToPaise,
} from "./commerce-money";

describe("commerce-money", () => {
  it("converts rupees to integer paise", () => {
    expect(rupeesToPaise(999)).toBe(99900);
    expect(rupeesToPaise(999.5)).toBe(99950);
    expect(rupeesToPaise(0.01)).toBe(1);
    expect(rupeesToPaise(0)).toBe(0);
  });

  it("converts paise to rupees", () => {
    expect(paiseToRupees(99900)).toBe(999);
    expect(paiseToRupees(1)).toBe(0.01);
  });

  it("rejects non-finite amounts", () => {
    expect(() => rupeesToPaise(Number.NaN)).toThrow(/finite/);
    expect(() => paiseToRupees(Number.POSITIVE_INFINITY)).toThrow(/finite/);
  });

  it("formats paise as rupee display", () => {
    expect(formatPaiseAsRupees(99900)).toContain("999");
    expect(formatPaiseAsRupees(99900).startsWith("₹")).toBe(true);
  });
});
