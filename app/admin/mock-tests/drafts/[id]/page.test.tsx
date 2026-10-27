import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TopicWiseDraftPage from "./page";
import type { TopicWiseDraft } from "../../types";

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
  },
}));

vi.mock("../../api", () => ({
  formatEzPrepError: (_error: unknown, fallback: string) => fallback,
  topicWiseDraftsApi: {
    getDraft: vi.fn(),
    searchQuestions: vi.fn(),
    replaceQuestion: vi.fn(),
    publishDraft: vi.fn(),
    discardDraft: vi.fn(),
  },
}));

import { topicWiseDraftsApi } from "../../api";

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

const draft: TopicWiseDraft = {
  id: "draft-1",
  examId: "e1",
  examName: "CGL",
  subjectId: "sub-1",
  subjectName: "Polity",
  topicId: "top-1",
  topicName: "Parliament",
  status: "REVIEW",
  settings: {
    totalQuestions: 10,
    durationInMinutes: 15,
    title: "Parliament practice",
    marksPerQuestion: 1,
    negativeMarking: 0.25,
    allowRetake: true,
    shuffleOptions: false,
    showResultsImmediately: true,
    accessMode: "FREE",
    difficultyDistribution: { easy: 3, medium: 3, hard: 4 },
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
          topic: "top-1",
        },
      ],
    },
  ],
  createdAt: "",
  updatedAt: "",
};

beforeEach(() => {
  router.push.mockReset();
  vi.mocked(topicWiseDraftsApi.getDraft).mockReset().mockResolvedValue({
    message: "ok",
    data: draft,
  });
  vi.mocked(topicWiseDraftsApi.searchQuestions).mockReset().mockResolvedValue({
    message: "ok",
    data: [
      {
        _id: "q9",
        snippet: "Replacement stem",
        questionText: { en: { text: "Replacement stem" } },
        options: [],
      },
    ],
    pagination: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  });
  vi.mocked(topicWiseDraftsApi.replaceQuestion).mockReset();
  vi.mocked(topicWiseDraftsApi.publishDraft).mockReset();
  vi.spyOn(message, "success").mockImplementation(
    (() => undefined) as unknown as typeof message.success
  );
  vi.spyOn(message, "error").mockImplementation(
    (() => undefined) as unknown as typeof message.error
  );
});

describe("TopicWiseDraftPage", () => {
  it("replaces within the locked slot and publishes", async () => {
    vi.mocked(topicWiseDraftsApi.replaceQuestion).mockResolvedValue({
      message: "replaced",
      data: draft,
    });
    vi.mocked(topicWiseDraftsApi.publishDraft).mockResolvedValue({
      message: "published",
      data: { mockTestId: "mt-9", draft },
    });

    render(<TopicWiseDraftPage params={paramsPromise()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Replace" }));

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => {
      expect(topicWiseDraftsApi.searchQuestions).toHaveBeenCalledWith(
        expect.objectContaining({ draftId: "draft-1" })
      );
    });
    expect(vi.mocked(topicWiseDraftsApi.searchQuestions).mock.calls[0][0]).not.toHaveProperty(
      "position"
    );
    expect(
      within(dialog).getByText("Replacement must stay on this topic and subject.")
    ).toBeInTheDocument();
    expect(within(dialog).queryByText("easy")).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /expand row/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Allow a different subject" })).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Use this" }));
    await waitFor(() => {
      expect(topicWiseDraftsApi.replaceQuestion).toHaveBeenCalledWith(
        "draft-1",
        0,
        "q9"
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => {
      expect(topicWiseDraftsApi.publishDraft).toHaveBeenCalledWith(
        "draft-1",
        expect.objectContaining({ accessMode: "FREE" })
      );
    });
    expect(router.push).toHaveBeenCalledWith("/admin/mock-tests/mt-9");
  });
});
