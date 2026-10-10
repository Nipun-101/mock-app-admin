import { beforeEach, describe, expect, it, vi } from "vitest";
import { ezPrepApiClient } from "./browser-client";
import { commerceHealthApi, emptyHealthReport, healthCards } from "./commerce-health";

vi.mock("./browser-client", () => ({
  ezPrepApiClient: {
    get: vi.fn(),
  },
}));

const get = vi.mocked(ezPrepApiClient.get);

describe("commerceHealthApi", () => {
  beforeEach(() => {
    get.mockReset();
  });

  it("loads the admin health snapshot", async () => {
    const report = emptyHealthReport("ok");
    get.mockResolvedValue({ message: "ok", data: report });
    await commerceHealthApi.get();
    expect(get).toHaveBeenCalledWith("/v1/admin/commerce/health");
  });

  it("links the six order flags and keeps other cards as samples", () => {
    const report = emptyHealthReport("degraded");
    report.needsReview = {
      count: 1,
      oldestAt: "2026-10-11T00:00:00.000Z",
      orderNumbers: ["ORD-1"],
    };
    report.duplicates = {
      count: 2,
      oldestAt: "2026-10-10T00:00:00.000Z",
      orderNumbers: ["ORD-2"],
      refunded: 1,
    };
    const cards = healthCards(report);
    expect(cards.find((card) => card.key === "needsReview")?.flag).toBe("needsReview");
    expect(cards.find((card) => card.key === "paidUnprovisioned")?.flag).toBe("unprovisioned");
    expect(cards.find((card) => card.key === "paidWithoutInvoice")?.flag).toBe("uninvoiced");
    expect(cards.find((card) => card.key === "lateCaptures7d")?.flag).toBe("lateCapture");
    expect(cards.find((card) => card.key === "redundantPurchases")?.flag).toBe(
      "redundantPurchase"
    );
    expect(cards.find((card) => card.key === "duplicates")).toMatchObject({
      flag: "duplicate",
      detail: "1 refunded",
      orderNumbers: ["ORD-2"],
    });
    expect(cards.find((card) => card.key === "pendingPastWindow")?.flag).toBeUndefined();
  });
});
