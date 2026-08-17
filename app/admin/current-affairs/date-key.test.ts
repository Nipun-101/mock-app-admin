import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
  dateKeyToDayjs,
  datePickerValueFromEvent,
  localDateKey,
  todayDateKey,
  toDateKey,
} from "./date-key";

describe("localDateKey and todayDateKey", () => {
  it("formats a local calendar day as YYYY-MM-DD", () => {
    const value = dayjs("2026-03-09T15:00:00");
    expect(localDateKey(value)).toBe("2026-03-09");
    expect(todayDateKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("toDateKey", () => {
  it("returns undefined for empty values", () => {
    expect(toDateKey(undefined)).toBeUndefined();
    expect(toDateKey(null)).toBeUndefined();
    expect(toDateKey("")).toBeUndefined();
    expect(toDateKey(123)).toBeUndefined();
  });

  it("accepts a strict YYYY-MM-DD string and rejects invalid calendar days", () => {
    expect(toDateKey("2026-01-15")).toBe("2026-01-15");
    expect(toDateKey("2026-13-40")).toBeUndefined();
    expect(toDateKey("not-a-date")).toBeUndefined();
  });

  it("parses other date strings into a local key", () => {
    expect(toDateKey("2026-01-15T12:00:00")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("accepts a valid Dayjs instance", () => {
    expect(toDateKey(dayjs("2026-02-01"))).toBe("2026-02-01");
    expect(toDateKey(dayjs("invalid"))).toBeUndefined();
  });
});

describe("dateKeyToDayjs", () => {
  it("parses strict keys and rejects junk", () => {
    expect(dateKeyToDayjs("2026-01-15")?.format("YYYY-MM-DD")).toBe("2026-01-15");
    expect(dateKeyToDayjs(undefined)).toBeUndefined();
    expect(dateKeyToDayjs("15-01-2026")).toBeUndefined();
    expect(dateKeyToDayjs("2026-02-31")).toBeUndefined();
  });
});

describe("datePickerValueFromEvent", () => {
  it("prefers a date string in the second argument", () => {
    expect(datePickerValueFromEvent(dayjs(), "2026-01-15")).toBe("2026-01-15");
  });

  it("uses the first string in an array of formatted values", () => {
    expect(datePickerValueFromEvent(null, ["2026-01-15T00:00:00"])).toBe(
      "2026-01-15"
    );
  });

  it("falls back to toDateKey on the first argument", () => {
    expect(datePickerValueFromEvent("2026-08-17")).toBe("2026-08-17");
    expect(datePickerValueFromEvent(null, 1)).toBeUndefined();
  });
});
