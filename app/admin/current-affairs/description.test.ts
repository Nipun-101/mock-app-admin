import { describe, expect, it } from "vitest";
import {
  coerceDescriptionPoints,
  formatDescriptionExcerpt,
  normalizeDescriptionForSubmit,
} from "./description";

describe("current affairs description helpers", () => {
  it("coerces legacy string descriptions into a one-item array", () => {
    expect(coerceDescriptionPoints("Legacy text")).toEqual(["Legacy text"]);
    expect(coerceDescriptionPoints([" first ", ""])).toEqual([" first "]);
  });

  it("normalizes submitted bullets by trimming and removing empties", () => {
    expect(
      normalizeDescriptionForSubmit(["  one  ", "", "two", "   "])
    ).toEqual(["one", "two"]);
    expect(normalizeDescriptionForSubmit([])).toBeUndefined();
  });

  it("formats description excerpts for list views", () => {
    expect(formatDescriptionExcerpt(["Alpha", "Beta"], 12)).toBe("Alpha · Beta");
    expect(formatDescriptionExcerpt("Legacy only")).toBe("Legacy only");
    expect(formatDescriptionExcerpt(undefined)).toBe("-");
  });
});
