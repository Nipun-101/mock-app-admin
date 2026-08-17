import { describe, expect, it, vi } from "vitest";
import {
  fetchAllPages,
  formatEzPrepError,
  omitEmpty,
  omitUndefined,
} from "./envelope";
import { EzPrepApiError } from "./types";

describe("formatEzPrepError", () => {
  it("returns the fallback for non-API errors", () => {
    expect(formatEzPrepError(new Error("boom"), "Failed")).toBe("Failed");
    expect(formatEzPrepError("string", "Failed")).toBe("Failed");
  });

  it("maps 401 and 403 to a session message", () => {
    expect(
      formatEzPrepError(new EzPrepApiError("x", 401, "/p", null), "Failed")
    ).toBe("Session expired or you are not signed in. Please sign in again.");
    expect(
      formatEzPrepError(new EzPrepApiError("x", 403, "/p", null), "Failed")
    ).toBe("Session expired or you are not signed in. Please sign in again.");
  });

  it("uses a string message and optional code", () => {
    expect(
      formatEzPrepError(
        new EzPrepApiError("fallback", 400, "/p", {
          message: "Bad input",
          error: "BAD_REQUEST",
        }),
        "Failed"
      )
    ).toBe("Bad input — (BAD_REQUEST)");
  });

  it("joins array messages and prefers code over error when both exist", () => {
    expect(
      formatEzPrepError(
        new EzPrepApiError("fallback", 400, "/p", {
          message: ["A", "B"],
          code: "C1",
        }),
        "Failed"
      )
    ).toBe("A, B — (C1)");
  });

  it("falls back to the error message when data has no usable message", () => {
    expect(
      formatEzPrepError(new EzPrepApiError("raw", 422, "/p", { foo: 1 }), "Failed")
    ).toBe("raw");
  });

  it("formats array details with positions, rules, and unknown items", () => {
    expect(
      formatEzPrepError(
        new EzPrepApiError("msg", 400, "/p", {
          message: "Invalid draft",
          details: [
            { displayPositions: [0, 2] },
            { rule: "count", expected: 10, actual: 8 },
            { rule: "unique" },
            "plain",
            { other: true },
          ],
        }),
        "Failed"
      )
    ).toBe(
      'Invalid draft — positions 0, 2; count: expected 10, got 8; unique; "plain"; {"other":true}'
    );
  });

  it("formats object details for subject shortage, position, expected/actual, and difficulty", () => {
    expect(
      formatEzPrepError(
        new EzPrepApiError("msg", 400, "/p", {
          message: "Cannot publish",
          details: {
            subjectName: "Math",
            needed: 20,
            available: 5,
            existingPosition: 3,
            expected: 4,
            actual: 2,
            difficulty: "hard",
            availableQuestions: 1,
          },
        }),
        "Failed"
      )
    ).toBe(
      "Cannot publish — Math: need 20, available 5 — already used at position 4 — expected 4, got 2 — hard: found 1, need 20"
    );
  });

  it("uses available/count aliases on difficulty details", () => {
    expect(
      formatEzPrepError(
        new EzPrepApiError("msg", 400, "/p", {
          message: "short",
          details: { difficulty: "easy", available: 2, count: 7 },
        }),
        "Failed"
      )
    ).toBe("short — easy: found 2, need 7");
  });

  it("ignores non-object data payloads", () => {
    expect(
      formatEzPrepError(new EzPrepApiError("plain", 500, "/p", "oops"), "Failed")
    ).toBe("plain");
  });
});

describe("fetchAllPages", () => {
  it("returns the first page when there is only one", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      message: "ok",
      data: [{ id: 1 }],
      pagination: { totalPages: 1 },
    });
    await expect(fetchAllPages(fetchPage, 50)).resolves.toEqual([{ id: 1 }]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(1, 50);
  });

  it("walks remaining pages and treats missing data as empty", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        message: "ok",
        data: [{ id: 1 }],
        pagination: { totalPages: 3 },
      })
      .mockResolvedValueOnce({ message: "ok", data: [{ id: 2 }] })
      .mockResolvedValueOnce({ message: "ok" });

    await expect(fetchAllPages(fetchPage)).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("defaults to a single page when pagination is missing", async () => {
    const fetchPage = vi.fn().mockResolvedValue({ message: "ok", data: [] });
    await expect(fetchAllPages(fetchPage)).resolves.toEqual([]);
  });
});

describe("omitEmpty", () => {
  it("drops empty string, undefined, and null keys", () => {
    expect(
      omitEmpty({ a: "keep", b: "", c: undefined, d: null, e: 0, f: false })
    ).toEqual({ a: "keep", e: 0, f: false });
  });
});

describe("omitUndefined", () => {
  it("drops only undefined keys", () => {
    expect(omitUndefined({ a: "keep", b: "", c: undefined, d: null })).toEqual({
      a: "keep",
      b: "",
      d: null,
    });
  });
});
