import { beforeEach, describe, expect, it, vi } from "vitest";
import { ezPrepApiClient } from "./browser-client";
import { feedbackApi } from "./feedback";

vi.mock("./browser-client", () => ({
  ezPrepApiClient: {
    get: vi.fn(),
  },
}));

const get = vi.mocked(ezPrepApiClient.get);

describe("feedbackApi", () => {
  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue({ data: [] });
  });

  it("loads the rating summary", async () => {
    await feedbackApi.summary();
    expect(get).toHaveBeenCalledWith("/v1/admin/feedback/summary");
  });

  it("lists feedback with page and limit", async () => {
    await feedbackApi.list({ page: 2, limit: 20 });
    expect(get).toHaveBeenCalledWith("/v1/admin/feedback", {
      searchParams: { page: 2, limit: 20 },
    });
  });

  it("sends an empty params object when called without arguments", async () => {
    await feedbackApi.list();
    expect(get).toHaveBeenCalledWith("/v1/admin/feedback", {
      searchParams: {},
    });
  });
});
