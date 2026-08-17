import { describe, expect, it } from "vitest";
import { EzPrepApiError } from "./types";

describe("EzPrepApiError", () => {
  it("stores status, path, and response data", () => {
    const error = new EzPrepApiError("nope", 404, "/v1/exams/1", { message: "missing" });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("EzPrepApiError");
    expect(error.message).toBe("nope");
    expect(error.status).toBe(404);
    expect(error.path).toBe("/v1/exams/1");
    expect(error.data).toEqual({ message: "missing" });
  });
});
