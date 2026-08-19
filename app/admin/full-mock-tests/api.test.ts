import { beforeEach, describe, expect, it, vi } from "vitest";
import { ezPrepApiClient } from "@/app/services/ezprep-api";
import { fullMockApi } from "./api";

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    ezPrepApiClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const get = vi.mocked(ezPrepApiClient.get);
const post = vi.mocked(ezPrepApiClient.post);
const patch = vi.mocked(ezPrepApiClient.patch);
const del = vi.mocked(ezPrepApiClient.delete);

beforeEach(() => {
  get.mockReset().mockResolvedValue({ message: "ok", data: [] });
  post.mockReset().mockResolvedValue({ message: "ok", data: {} });
  patch.mockReset().mockResolvedValue({ message: "ok", data: {} });
  del.mockReset().mockResolvedValue({ message: "ok" });
});

describe("fullMockApi", () => {
  it("covers exams, drafts, search, replace, publish, discard, and published tests", async () => {
    await fullMockApi.listExams({ page: 1, search: "upsc" });
    await fullMockApi.createDraft("e1");
    await fullMockApi.getDraft("d1");
    await fullMockApi.searchQuestions({
      subjectId: "s1",
      page: 1,
      allowCrossSubject: true,
    });
    await fullMockApi.replaceQuestion("d1", 3, "q9", {
      allowCrossSubject: true,
    });
    await fullMockApi.publishDraft("d1", { title: "Paper 1" });
    await fullMockApi.discardDraft("d1");
    await fullMockApi.listPublished({ examId: "e1" });
    await fullMockApi.getPublished("m1");

    expect(get).toHaveBeenCalledWith("/v1/full-mock-tests/exams", {
      searchParams: { page: 1, search: "upsc" },
    });
    expect(post).toHaveBeenCalledWith("/v1/full-mock-tests/drafts", { examId: "e1" });
    expect(get).toHaveBeenCalledWith("/v1/full-mock-tests/drafts/d1");
    expect(get).toHaveBeenCalledWith("/v1/full-mock-tests/questions", {
      searchParams: { subjectId: "s1", page: 1, allowCrossSubject: true },
    });
    expect(patch).toHaveBeenCalledWith(
      "/v1/full-mock-tests/drafts/d1/questions/3",
      { questionId: "q9", allowCrossSubject: true }
    );
    expect(post).toHaveBeenCalledWith("/v1/full-mock-tests/drafts/d1/publish", {
      title: "Paper 1",
    });
    expect(del).toHaveBeenCalledWith("/v1/full-mock-tests/drafts/d1");
    expect(get).toHaveBeenCalledWith("/v1/full-mock-tests", {
      searchParams: { examId: "e1" },
    });
    expect(get).toHaveBeenCalledWith("/v1/full-mock-tests/m1");
  });
});
