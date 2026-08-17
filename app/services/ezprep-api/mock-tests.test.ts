import { beforeEach, describe, expect, it, vi } from "vitest";
import { ezPrepApiClient } from "./browser-client";
import { mockTestsApi } from "./mock-tests";

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

const payload = {
  totalQuestions: 10,
  durationInMinutes: 30,
  exam: "e1",
  subject: "s1",
  difficultyDistribution: { easy: 4, medium: 4, hard: 2 },
  title: "",
};

beforeEach(() => {
  get.mockReset().mockResolvedValue({ message: "ok", data: [] });
  post.mockReset().mockResolvedValue({ message: "ok", data: {} });
  patch.mockReset().mockResolvedValue({ message: "ok", data: {} });
  del.mockReset().mockResolvedValue({ message: "ok" });
});

describe("mockTestsApi", () => {
  it("lists, gets, creates, updates, and deletes", async () => {
    await mockTestsApi.list({ page: 1, search: "upsc" });
    await mockTestsApi.get("m1");
    await mockTestsApi.create(payload);
    await mockTestsApi.update("m1", { ...payload, title: undefined as never });
    await mockTestsApi.delete("m1");

    expect(get).toHaveBeenCalledWith("/v1/mock-tests", {
      searchParams: { page: 1, search: "upsc" },
    });
    expect(get).toHaveBeenCalledWith("/v1/mock-tests/m1");
    expect(post).toHaveBeenCalledWith("/v1/mock-tests", {
      totalQuestions: 10,
      durationInMinutes: 30,
      exam: "e1",
      subject: "s1",
      difficultyDistribution: { easy: 4, medium: 4, hard: 2 },
    });
    expect(patch.mock.calls[0][0]).toBe("/v1/mock-tests/m1");
    expect(patch.mock.calls[0][1]).not.toHaveProperty("title");
    expect(del).toHaveBeenCalledWith("/v1/mock-tests/m1");
  });
});
