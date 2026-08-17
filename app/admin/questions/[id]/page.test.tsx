import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Question } from "@/app/services/ezprep-api";
import EditQuestionPage from "./page";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/app/components/ImageUpload", () => ({
  ImageUpload: ({ label }: { label?: string }) => (
    <div data-testid="image-upload">{label ?? "Image upload"}</div>
  ),
  toPlainImageMetadata: (value: unknown) => {
    if (!value || typeof value !== "object") return undefined;
    const row = value as { key?: unknown; bucket?: unknown };
    if (typeof row.key !== "string" || !row.key) return undefined;
    if (typeof row.bucket !== "string" || !row.bucket) return undefined;
    return value;
  },
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
    questionsApi: {
      create: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
      delete: vi.fn(),
    },
    catalogApi: {
      ...actual.catalogApi,
      listSubjects: vi.fn(),
      listAllExams: vi.fn(),
      getSubject: vi.fn(),
      listAllTags: vi.fn(),
    },
  };
});

import { catalogApi, questionsApi } from "@/app/services/ezprep-api";

const listSubjects = vi.mocked(catalogApi.listSubjects);
const listAllExams = vi.mocked(catalogApi.listAllExams);
const getSubject = vi.mocked(catalogApi.getSubject);
const listAllTags = vi.mocked(catalogApi.listAllTags);
const getQuestion = vi.mocked(questionsApi.get);
const update = vi.mocked(questionsApi.update);

const question: Question = {
  id: "id-1",
  questionText: {
    en: { text: "Capital of India?" },
    ml: { text: "ഇന്ത്യയുടെ തലസ്ഥാനം?" },
  },
  optionType: "text",
  options: [
    { id: "opt-a", type: "text", en: "Mumbai" },
    { id: "opt-b", type: "text", en: "Delhi" },
    { id: "opt-c", type: "text", en: "Kolkata" },
    { id: "opt-d", type: "text", en: "Chennai" },
  ],
  explanation: { en: "Delhi is the capital", ml: null },
  correctAnswer: "opt-b",
  subject: { id: "sub-1", name: "History" },
  topic: { id: "top-1", name: "Ancient" },
  exams: [{ id: "ex-1", name: "UPSC" }],
  difficultyLevel: "easy",
  isActive: true,
};

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

async function renderReady(data: Question = question) {
  listSubjects.mockResolvedValue({
    message: "ok",
    data: [
      {
        id: "sub-1",
        name: "History",
        topics: [{ id: "top-1", name: "Ancient" }],
      },
    ],
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
  ]);
  getSubject.mockResolvedValue({
    message: "ok",
    data: {
      id: "sub-1",
      name: "History",
      topics: [{ id: "top-1", name: "Ancient" }],
    },
  });
  listAllTags.mockResolvedValue([
    { id: "tag-1", name: "GK", subject: "sub-1", topic: "top-1" },
  ]);
  getQuestion.mockResolvedValue({ message: "ok", data });
  render(<EditQuestionPage params={paramsPromise()} />);
  expect(await screen.findByDisplayValue("Capital of India?")).toBeInTheDocument();
}

describe("EditQuestionPage", () => {
  beforeEach(() => {
    listSubjects.mockReset();
    listAllExams.mockReset();
    getSubject.mockReset();
    listAllTags.mockReset();
    getQuestion.mockReset();
    update.mockReset();
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

  it("loads catalogs and the question into the form", async () => {
    await renderReady();
    expect(getQuestion).toHaveBeenCalledWith("id-1");
    expect(screen.getByDisplayValue("Mumbai")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Delhi is the capital")).toBeInTheDocument();
    expect(screen.getByText("Edit Question")).toBeInTheDocument();
  });

  it("updates the question and navigates back", async () => {
    update.mockResolvedValue({ message: "ok", data: question });
    await renderReady();

    fireEvent.change(screen.getByPlaceholderText("Enter question text in English"), {
      target: { value: "What is the capital of India?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update question/i }));

    await waitFor(() => expect(update).toHaveBeenCalledWith("id-1", expect.any(Object)));
    expect(update.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        subject: "sub-1",
        topic: "top-1",
        correctAnswer: "opt-b",
        difficultyLevel: "easy",
      })
    );
    expect(message.success).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/admin/questions");
  });

  it("blocks image-option submit when images are missing", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("radio", { name: "Image" }));
    fireEvent.click(screen.getByRole("button", { name: /update question/i }));

    await waitFor(() =>
      expect(message.error).toHaveBeenCalledWith("Please upload images for all options")
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("surfaces catalog load errors", async () => {
    listSubjects.mockRejectedValue(new Error("nope"));
    listAllExams.mockRejectedValue(new Error("nope"));

    render(<EditQuestionPage params={paramsPromise()} />);

    await waitFor(() =>
      expect(message.error).toHaveBeenCalledWith("Failed to fetch data")
    );
  });

  it("surfaces question fetch errors", async () => {
    listSubjects.mockResolvedValue({ message: "ok", data: [] });
    listAllExams.mockResolvedValue([]);
    getQuestion.mockRejectedValue(new Error("nope"));

    render(<EditQuestionPage params={paramsPromise()} />);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("surfaces update errors", async () => {
    update.mockRejectedValue(new Error("nope"));
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: /update question/i }));
    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });

  it("can add an extra explanation image slot", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: /add image/i }));
    expect(screen.getByLabelText("Remove additional image 1")).toBeInTheDocument();
  });
});
