import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FixFailedQuestionPage from "./page";
import type { FailedQuestion } from "../types";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/components/ConfirmModal", () => ({
  showConfirmModal: ({ onConfirm }: { onConfirm: () => void | Promise<void> }) => {
    void onConfirm();
  },
}));

vi.mock("@/app/components/ImageUpload", () => ({
  ImageUpload: ({ label }: { label?: string }) => (
    <div data-testid="image-upload">{label ?? "Image upload"}</div>
  ),
  toPlainImageMetadata: (value: unknown) => value,
  hasImageUploader: () => false,
  uploadPastedImage: async () => false,
}));

vi.mock("@/app/components/PasteToImage", () => ({
  PasteToImage: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PasteHint: () => <span>paste hint</span>,
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
      listAllExams: vi.fn(),
      getSubject: vi.fn(),
      listAllTags: vi.fn(),
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

const listSubjects = vi.mocked(catalogApi.listSubjects);
const listAllExams = vi.mocked(catalogApi.listAllExams);
const getSubject = vi.mocked(catalogApi.getSubject);
const listAllTags = vi.mocked(catalogApi.listAllTags);
const apiGet = vi.mocked(ezPrepApiClient.get);
const apiPost = vi.mocked(ezPrepApiClient.post);
const apiDelete = vi.mocked(ezPrepApiClient.delete);

function paramsPromise(id = "id-1") {
  const value = { id };
  return {
    status: "fulfilled" as const,
    value,
    then(onFulfilled?: (v: { id: string }) => unknown) {
      return Promise.resolve(onFulfilled ? onFulfilled(value) : value);
    },
  } as unknown as Promise<{ id: string }>;
}

function renderFixPage() {
  return render(<FixFailedQuestionPage params={paramsPromise()} />);
}
const SUBJECT_ID = "507f1f77bcf86cd799439011";
const TOPIC_ID = "507f1f77bcf86cd799439012";
const EXAM_ID = "507f1f77bcf86cd799439013";
const OPTION_IDS = [
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
];

const detail: FailedQuestion = {
  id: "id-1",
  uploadId: "up-1",
  questionNumber: 4,
  failureStage: "validation",
  failureMessage: "Correct answer is missing",
  matchedQuestion: { number: 4, question: "Who elects the President?" },
  question: {
    questionText: {
      en: { text: "Who elects the President of India?", image: null },
      ml: { text: null, image: null },
    },
    optionType: "text",
    options: [
      { id: OPTION_IDS[0], type: "text", en: "Lok Sabha" },
      { id: OPTION_IDS[1], type: "text", en: "Electoral College" },
      { id: OPTION_IDS[2], type: "text", en: "Rajya Sabha" },
      { id: OPTION_IDS[3], type: "text", en: "Supreme Court" },
    ],
    explanation: { en: "Article 54", ml: null, image: null },
    correctAnswer: OPTION_IDS[1],
    subject: SUBJECT_ID,
    topic: TOPIC_ID,
    exams: [EXAM_ID],
    difficultyLevel: "medium",
  },
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

async function renderReady(item: FailedQuestion = detail) {
  listSubjects.mockResolvedValue({
    message: "ok",
    data: [
      {
        id: SUBJECT_ID,
        name: "Polity",
        topics: [{ id: TOPIC_ID, name: "Parliament" }],
      },
    ],
  });
  listAllExams.mockResolvedValue([
    {
      id: EXAM_ID,
      name: "UPSC",
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
      id: SUBJECT_ID,
      name: "Polity",
      topics: [{ id: TOPIC_ID, name: "Parliament" }],
    },
  });
  listAllTags.mockResolvedValue([
    { id: "507f1f77bcf86cd799439014", name: "GK", subject: SUBJECT_ID, topic: TOPIC_ID },
  ]);
  apiGet.mockResolvedValue({ message: "ok", data: item });
  renderFixPage();
  expect(await screen.findByText(/Failed at stage: validation/)).toBeInTheDocument();
}

describe("FixFailedQuestionPage", () => {
  beforeEach(() => {
    listSubjects.mockReset();
    listAllExams.mockReset();
    getSubject.mockReset();
    listAllTags.mockReset();
    apiGet.mockReset();
    apiPost.mockReset();
    apiDelete.mockReset();
    push.mockReset();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.mocked(message.error).mockClear();
    vi.mocked(message.success).mockClear();
  });

  it("loads the failed question and enables Fix when the form is valid", async () => {
    await renderReady();
    expect(screen.getByText("Correct answer is missing")).toBeInTheDocument();
    expect(screen.getByText("Matched source text:")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Who elects the President of India?")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Fix" })).toBeEnabled();
    expect(apiGet).toHaveBeenCalledWith("/v1/imports/failed-questions/id-1");
  });

  it("imports a fixed question", async () => {
    apiPost.mockResolvedValue({ message: "Question imported successfully" });
    await renderReady();
    await waitFor(() => expect(screen.getByRole("button", { name: "Fix" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Fix" }));
    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith(
        "/v1/imports/failed-questions/id-1/import",
        expect.objectContaining({
          question: expect.objectContaining({
            correctAnswer: OPTION_IDS[1],
            subject: SUBJECT_ID,
            topic: TOPIC_ID,
          }),
        })
      )
    );
    expect(push).toHaveBeenCalledWith("/admin/failed-questions");
  });

  it("keeps Fix disabled when required fields are missing", async () => {
    await renderReady({
      ...detail,
      question: {
        ...detail.question!,
        explanation: { en: "", ml: null, image: null },
        correctAnswer: "",
      },
    });
    expect(await screen.findByRole("button", { name: "Fix" })).toBeDisabled();
  });

  it("deletes the failed question after confirm", async () => {
    apiDelete.mockResolvedValue({
      message: "Failed question deleted successfully",
      data: { failedQuestionId: "id-1", uploadId: "up-1", questionNumber: 4 },
    });
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(apiDelete).toHaveBeenCalledWith("/v1/imports/failed-questions/id-1")
    );
    expect(push).toHaveBeenCalledWith("/admin/failed-questions");
  });

  it("surfaces fetch, import, and delete errors", async () => {
    apiGet.mockRejectedValue(new Error("nope"));
    listSubjects.mockResolvedValue({ message: "ok", data: [] });
    listAllExams.mockResolvedValue([]);
    renderFixPage();
    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("surfaces an import error", async () => {
    apiPost.mockRejectedValue(new Error("nope"));
    await renderReady();
    await waitFor(() => expect(screen.getByRole("button", { name: "Fix" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Fix" }));
    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });
});
