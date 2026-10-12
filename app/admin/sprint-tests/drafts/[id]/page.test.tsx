import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SprintDraftPage from "./page";
import type { SprintDraft } from "../../types";

const { router } = vi.hoisted(() => ({
  router: { push: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/components/ConfirmModal", () => ({
  showConfirmModal: ({ onConfirm }: { onConfirm: () => void | Promise<void> }) => {
    void onConfirm();
  },
}));

vi.mock("@/app/services/ezprep-api", () => ({
  catalogApi: {
    getSubject: vi.fn(),
    listSubjects: vi.fn(),
  },
}));

vi.mock("../../api", () => ({
  formatEzPrepError: (_error: unknown, fallback: string) => fallback,
  sprintTestsApi: {
    getDraft: vi.fn(),
    searchQuestions: vi.fn(),
    replaceQuestion: vi.fn(),
    publishDraft: vi.fn(),
    discardDraft: vi.fn(),
  },
}));

import { catalogApi } from "@/app/services/ezprep-api";
import { sprintTestsApi } from "../../api";

function paramsPromise(id = "draft-1") {
  const value = { id };
  return {
    status: "fulfilled" as const,
    value,
    then(onFulfilled?: (resolved: { id: string }) => unknown) {
      return Promise.resolve(onFulfilled ? onFulfilled(value) : value);
    },
  } as unknown as Promise<{ id: string }>;
}

const draft: SprintDraft = {
  id: "draft-1",
  examId: "e1",
  examName: "CGL",
  status: "REVIEW",
  settings: {
    totalQuestions: 10,
    durationInMinutes: 15,
    title: "Morning sprint",
    marksPerQuestion: 1,
    negativeMarking: 0.25,
    allowRetake: true,
    shuffleOptions: false,
    showResultsImmediately: true,
  },
  subjects: [
    {
      subjectId: "sub-1",
      name: "Polity",
      questions: [
        {
          _id: "q1",
          position: 0,
          marksPerQuestion: 1,
          negativeMarking: 0.25,
          questionText: { en: { text: "Who elects the President?" }, ml: { text: null } },
          options: [{ id: "a", type: "text", en: "Parliament" }],
          difficultyLevel: "easy",
        },
      ],
    },
  ],
  createdAt: "",
  updatedAt: "",
};

beforeEach(() => {
  router.push.mockReset();
  vi.mocked(sprintTestsApi.getDraft).mockReset().mockResolvedValue({
    message: "ok",
    data: draft,
  });
  vi.mocked(catalogApi.getSubject).mockReset().mockResolvedValue({
    message: "ok",
    data: { id: "sub-1", name: "Polity", topics: [{ id: "t1", name: "Parliament" }] },
  } as Awaited<ReturnType<typeof catalogApi.getSubject>>);
  vi.mocked(catalogApi.listSubjects).mockReset().mockResolvedValue({
    message: "ok",
    data: [{ id: "sub-2", name: "Science", topics: [] }],
  } as Awaited<ReturnType<typeof catalogApi.listSubjects>>);
  vi.mocked(sprintTestsApi.searchQuestions).mockReset().mockResolvedValue({
    message: "ok",
    data: [
      {
        _id: "q9",
        snippet: "Replacement stem",
        questionText: { en: { text: "Replacement stem" } },
        options: [],
      },
    ],
    pagination: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPrevPage: false },
  });
  vi.mocked(sprintTestsApi.replaceQuestion).mockReset();
  vi.mocked(sprintTestsApi.publishDraft).mockReset();
  vi.spyOn(message, "success").mockImplementation(
    (() => undefined) as unknown as typeof message.success
  );
  vi.spyOn(message, "error").mockImplementation(
    (() => undefined) as unknown as typeof message.error
  );
});

describe("SprintDraftPage", () => {
  it("replaces a question with the cross-subject flag and publishes", async () => {
    vi.mocked(sprintTestsApi.replaceQuestion).mockResolvedValue({
      message: "replaced",
      data: draft,
    });
    vi.mocked(sprintTestsApi.publishDraft).mockResolvedValue({
      message: "published",
      data: { mockTestId: "sp-9", draft },
    });

    render(<SprintDraftPage params={paramsPromise()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Replace" }));
    fireEvent.click(await screen.findByRole("switch", { name: "Allow a different subject" }));
    fireEvent.click(await screen.findByRole("button", { name: "Use this" }));

    await waitFor(() => {
      expect(sprintTestsApi.replaceQuestion).toHaveBeenCalledWith("draft-1", 0, "q9", {
        allowCrossSubject: true,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => {
      expect(sprintTestsApi.publishDraft).toHaveBeenCalled();
    });
    expect(sprintTestsApi.publishDraft).toHaveBeenCalledWith(
      "draft-1",
      expect.objectContaining({ accessMode: "FREE" })
    );
    expect(router.push).toHaveBeenCalledWith("/admin/sprint-tests/sp-9");
  });

  it("publishes a sprint as entitled when the switch is on", async () => {
    vi.mocked(sprintTestsApi.publishDraft).mockResolvedValue({
      message: "published",
      data: { mockTestId: "sp-9", draft },
    });

    render(<SprintDraftPage params={paramsPromise()} />);
    fireEvent.click(await screen.findByRole("switch", { name: "Requires entitlement" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => {
      expect(sprintTestsApi.publishDraft).toHaveBeenCalledWith(
        "draft-1",
        expect.objectContaining({ accessMode: "ENTITLED" })
      );
    });
  });
});
