import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FailedQuestionsPage from "./page";
import type { FailedQuestion } from "./types";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/ConfirmModal", () => ({
  showConfirmModal: ({ onConfirm }: { onConfirm: () => void | Promise<void> }) => {
    void onConfirm();
  },
}));

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    catalogApi: {
      ...actual.catalogApi,
      listSubjects: vi.fn(),
      listTopics: vi.fn(),
      listAllExams: vi.fn(),
      getSubject: vi.fn(),
    },
    ezPrepApiClient: {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
    },
  };
});

import { catalogApi, ezPrepApiClient } from "@/app/services/ezprep-api";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";

const listSubjects = vi.mocked(catalogApi.listSubjects);
const listTopics = vi.mocked(catalogApi.listTopics);
const listAllExams = vi.mocked(catalogApi.listAllExams);
const getSubject = vi.mocked(catalogApi.getSubject);
const apiGet = vi.mocked(ezPrepApiClient.get);
const apiDelete = vi.mocked(ezPrepApiClient.delete);

function makeItem(overrides: Partial<FailedQuestion> = {}): FailedQuestion {
  return {
    id: "fq-1",
    uploadId: "up-1",
    questionNumber: 4,
    failureStage: "validation",
    failureMessage: "Correct answer is missing",
    question: {
      questionText: {
        en: { text: "Who elects the President of India?", image: null },
        ml: { text: "ആരാണ് പ്രസിഡന്റിനെ തിരഞ്ഞെടുക്കുന്നത്?", image: null },
      },
      optionType: "text",
      options: [],
      explanation: { en: null, ml: null, image: null },
      correctAnswer: "",
      subject: "sub-1",
      topic: "top-1",
      exams: ["ex-1", "ex-2", "ex-3"],
      difficultyLevel: "medium",
    },
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

async function renderReady(items: FailedQuestion[] = [makeItem()]) {
  listSubjects.mockResolvedValue({
    message: "ok",
    data: [
      {
        id: "sub-1",
        name: "Polity",
        topics: [{ id: "top-1", name: "Parliament" }],
      },
    ],
  });
  listTopics.mockResolvedValue({
    message: "ok",
    data: [{ id: "top-1", name: "Parliament" }],
  });
  listAllExams.mockResolvedValue([
    {
      id: "ex-1",
      name: "UPSC",
      isSessionWise: false,
      hasMultiLingualSupport: false,
      isActive: true,
      category: "c1",
      examGroup: "g1",
    },
    {
      id: "ex-2",
      name: "SSC",
      isSessionWise: false,
      hasMultiLingualSupport: false,
      isActive: true,
      category: "c1",
      examGroup: "g1",
    },
    {
      id: "ex-3",
      name: "State PSC",
      isSessionWise: false,
      hasMultiLingualSupport: false,
      isActive: true,
      category: "c1",
      examGroup: "g1",
    },
  ]);
  getSubject.mockResolvedValue({
    message: "ok",
    data: {
      id: "sub-1",
      name: "Polity",
      topics: [{ id: "top-1", name: "Parliament" }],
    },
  });
  apiGet.mockResolvedValue({
    message: "ok",
    data: {
      items,
      pagination: { page: 1, limit: 10, total: items.length, totalPages: 1 },
    },
  });
  render(<FailedQuestionsPage />);
  expect(await screen.findByText("Failed Questions")).toBeInTheDocument();
}

describe("FailedQuestionsPage", () => {
  beforeEach(() => {
    listSubjects.mockReset();
    listTopics.mockReset();
    listAllExams.mockReset();
    getSubject.mockReset();
    apiGet.mockReset();
    apiDelete.mockReset();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.mocked(message.error).mockClear();
    vi.mocked(message.success).mockClear();
  });

  it("lists failed questions and links to the fix page", async () => {
    await renderReady();
    expect(screen.getByText("Who elects the Presi...")).toBeInTheDocument();
    expect(screen.getByText("validation")).toBeInTheDocument();
    expect(screen.getByText("Correct answer is missing")).toBeInTheDocument();
    expect(screen.getByText("Polity")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fix" })).toHaveAttribute(
      "href",
      "/admin/failed-questions/fq-1"
    );
    expect(apiGet).toHaveBeenCalledWith(
      "/v1/imports/failed-questions",
      expect.objectContaining({
        searchParams: expect.objectContaining({ page: 1, limit: 10 }),
      })
    );
  });

  it("shows an empty table when there are no items", async () => {
    await renderReady([]);
    expect(await screen.findAllByText("No data")).not.toHaveLength(0);
  });

  it("deletes a failed question after confirm", async () => {
    apiDelete.mockResolvedValue({
      message: "Failed question deleted successfully",
      data: { failedQuestionId: "fq-1", uploadId: "up-1", questionNumber: 4 },
    });
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(apiDelete).toHaveBeenCalledWith("/v1/imports/failed-questions/fq-1")
    );
    expect(message.success).toHaveBeenCalled();
  });

  it("surfaces list and delete errors", async () => {
    listSubjects.mockRejectedValue(new Error("nope"));
    listTopics.mockRejectedValue(new Error("nope"));
    listAllExams.mockRejectedValue(new Error("nope"));
    apiGet.mockRejectedValue(
      new EzPrepApiError("boom", 500, "/v1/imports/failed-questions", null)
    );
    render(<FailedQuestionsPage />);
    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("surfaces a delete error", async () => {
    apiDelete.mockRejectedValue(new Error("nope"));
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("renders dashes when the draft is missing optional fields", async () => {
    await renderReady([
      makeItem({
        question: undefined,
        questionDraft: {
          questionText: { en: { text: null, image: null }, ml: { text: null, image: null } },
          optionType: "text",
          options: [],
          explanation: { en: null, ml: null, image: null },
          correctAnswer: "",
          subject: "",
          topic: "",
          exams: [],
          difficultyLevel: "",
        },
        failureMessage: "x".repeat(50),
      }),
    ]);
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    expect(screen.getByText(`${"x".repeat(40)}...`)).toBeInTheDocument();
  });
});
