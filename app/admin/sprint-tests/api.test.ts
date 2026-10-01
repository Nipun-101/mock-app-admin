import { beforeEach, describe, expect, it, vi } from "vitest";
import { ezPrepApiClient } from "@/app/services/ezprep-api/browser-client";
import { sprintTestsApi } from "./api";

vi.mock("@/app/services/ezprep-api/browser-client", () => ({
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
  get.mockReset().mockResolvedValue({ message: "ok", data: [], pagination: {} });
  post.mockReset().mockResolvedValue({ message: "ok", data: {} });
  patch.mockReset().mockResolvedValue({ message: "ok", data: {} });
  del.mockReset().mockResolvedValue({ message: "ok" });
});

describe("sprintTestsApi", () => {
  it("calls the sprint draft and published endpoints", async () => {
    await sprintTestsApi.createDraft({
      examId: "e1",
      totalQuestions: 10,
      durationInMinutes: 15,
    });
    await sprintTestsApi.listDrafts({ page: 1 });
    await sprintTestsApi.getDraft("d1");
    await sprintTestsApi.searchQuestions({
      draftId: "d1",
      subjectId: "s1",
      allowCrossSubject: true,
    });
    await sprintTestsApi.replaceQuestion("d1", 2, "q9", { allowCrossSubject: true });
    await sprintTestsApi.publishDraft("d1", { title: "Sprint 1" });
    await sprintTestsApi.discardDraft("d1");
    await sprintTestsApi.listPublished({ page: 1 });
    await sprintTestsApi.getPublished("m1");
    await sprintTestsApi.deletePublished("m1");

    expect(post).toHaveBeenCalledWith("/v1/sprint-tests/drafts", {
      examId: "e1",
      totalQuestions: 10,
      durationInMinutes: 15,
    });
    expect(get).toHaveBeenCalledWith("/v1/sprint-tests/drafts", {
      searchParams: { page: 1 },
    });
    expect(get).toHaveBeenCalledWith("/v1/sprint-tests/drafts/d1");
    expect(get).toHaveBeenCalledWith("/v1/sprint-tests/questions", {
      searchParams: { draftId: "d1", subjectId: "s1", allowCrossSubject: true },
    });
    expect(patch).toHaveBeenCalledWith("/v1/sprint-tests/drafts/d1/questions/2", {
      questionId: "q9",
      allowCrossSubject: true,
    });
    expect(post).toHaveBeenCalledWith("/v1/sprint-tests/drafts/d1/publish", {
      title: "Sprint 1",
    });
    expect(del).toHaveBeenCalledWith("/v1/sprint-tests/drafts/d1");
    expect(get).toHaveBeenCalledWith("/v1/sprint-tests", { searchParams: { page: 1 } });
    expect(get).toHaveBeenCalledWith("/v1/sprint-tests/m1");
    expect(del).toHaveBeenCalledWith("/v1/sprint-tests/m1");
  });
});
