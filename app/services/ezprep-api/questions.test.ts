import { beforeEach, describe, expect, it, vi } from "vitest";
import { ezPrepApiClient } from "./browser-client";
import { questionsApi } from "./questions";

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
  questionText: { en: { text: "2+2?" } },
  options: [],
  correctAnswer: "a",
  tag: "",
};

beforeEach(() => {
  get.mockReset().mockResolvedValue({ message: "ok", data: [] });
  post.mockReset().mockResolvedValue({ message: "ok", data: {} });
  patch.mockReset().mockResolvedValue({ message: "ok", data: {} });
  del.mockReset().mockResolvedValue({ message: "ok" });
});

describe("questionsApi", () => {
  it("lists with search params and gets by id", async () => {
    await questionsApi.list({ page: 1, subjectId: "s1" });
    await questionsApi.get("q1");
    expect(get).toHaveBeenCalledWith("/v1/questions", {
      searchParams: { page: 1, subjectId: "s1" },
    });
    expect(get).toHaveBeenCalledWith("/v1/questions/q1");
  });

  it("creates with empty fields omitted and updates with undefined omitted", async () => {
    await questionsApi.create(payload);
    await questionsApi.update("q1", { ...payload, tag: undefined as never });
    expect(post).toHaveBeenCalledWith("/v1/questions", {
      questionText: payload.questionText,
      options: [],
      correctAnswer: "a",
    });
    expect(patch.mock.calls[0][0]).toBe("/v1/questions/q1");
    expect(patch.mock.calls[0][1]).not.toHaveProperty("tag");
  });

  it("deletes by id", async () => {
    await questionsApi.delete("q1");
    expect(del).toHaveBeenCalledWith("/v1/questions/q1");
  });
});
