import { beforeEach, describe, expect, it, vi } from "vitest";
import { ezPrepApiClient } from "./browser-client";
import { currentAffairsApi } from "./current-affairs";

vi.mock("./browser-client", () => ({
  ezPrepApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const get = vi.mocked(ezPrepApiClient.get);
const post = vi.mocked(ezPrepApiClient.post);
const patch = vi.mocked(ezPrepApiClient.patch);
const del = vi.mocked(ezPrepApiClient.delete);

beforeEach(() => {
  get.mockReset().mockResolvedValue({ message: "ok", data: [] });
  post.mockReset().mockResolvedValue({ message: "ok", data: {} });
  patch.mockReset().mockResolvedValue({ message: "ok", data: {} });
  del.mockReset().mockResolvedValue({ message: "ok", data: {} });
});

describe("currentAffairsApi", () => {
  it("lists, gets, creates, updates, and deletes", async () => {
    await currentAffairsApi.list({ date: "2026-01-15", page: 1 });
    await currentAffairsApi.get("ca1");
    await currentAffairsApi.create({
      title: "Budget",
      date: "2026-01-15",
      description: "",
    });
    await currentAffairsApi.update("ca1", { title: "Budget", description: undefined });
    await currentAffairsApi.delete("ca1");

    expect(get).toHaveBeenCalledWith("/v1/current-affairs", {
      searchParams: { date: "2026-01-15", page: 1 },
    });
    expect(get).toHaveBeenCalledWith("/v1/current-affairs/ca1");
    expect(post).toHaveBeenCalledWith("/v1/current-affairs", {
      title: "Budget",
      date: "2026-01-15",
    });
    expect(patch.mock.calls[0][1]).toEqual({ title: "Budget" });
    expect(del).toHaveBeenCalledWith("/v1/current-affairs/ca1");
  });
});
