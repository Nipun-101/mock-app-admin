import { describe, expect, it } from "vitest";
import {
  BULK_UPLOAD_POLLING_INTERVAL_MS,
  BULK_UPLOAD_STATUSES,
  ENRICH_CONFIG,
  PARSE_PDF_CONFIG,
} from "./types";

describe("bulk upload constants", () => {
  it("lists every known status in pipeline order", () => {
    expect(BULK_UPLOAD_STATUSES).toEqual([
      "uploaded",
      "parsing",
      "parsed",
      "processing",
      "enriched",
      "completed",
      "failed",
    ]);
  });

  it("exposes parse and enrich client defaults", () => {
    expect(PARSE_PDF_CONFIG).toEqual({
      maxPollingAttempts: 60,
      pollingIntervalMs: 5000,
    });
    expect(ENRICH_CONFIG).toEqual({ adaptiveChunking: true, maxRetries: 3 });
    expect(BULK_UPLOAD_POLLING_INTERVAL_MS).toBe(30_000);
  });
});
