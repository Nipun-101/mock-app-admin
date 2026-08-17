import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateQuestionPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
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
const create = vi.mocked(questionsApi.create);

const subjects = {
  message: "ok",
  data: [
    {
      id: "sub-1",
      name: "History",
      topics: [{ id: "top-1", name: "Ancient" }],
      isActive: true,
    },
  ],
};

const exams = [{ id: "ex-1", name: "UPSC", isSessionWise: false, hasMultiLingualSupport: false, isActive: true, category: "c1", examGroup: "g1" }];

async function chooseOption(formLabel: string, optionText: string) {
  const label = screen.getByText(formLabel, { selector: "label" });
  const item = label.closest(".ant-form-item");
  fireEvent.mouseDown(item!.querySelector(".ant-select-selector")!);
  const option = await waitFor(() => {
    const match = [...document.querySelectorAll(".ant-select-item-option-content")].find(
      (node) => node.textContent === optionText
    );
    expect(match).toBeTruthy();
    return match!;
  });
  fireEvent.click(option);
}

async function renderReady() {
  listSubjects.mockResolvedValue(subjects);
  listAllExams.mockResolvedValue(exams);
  getSubject.mockResolvedValue({
    message: "ok",
    data: {
      id: "sub-1",
      name: "History",
      topics: [{ id: "top-1", name: "Ancient" }],
    },
  });
  listAllTags.mockResolvedValue([{ id: "tag-1", name: "GK", subject: "sub-1", topic: "top-1" }]);
  render(<CreateQuestionPage />);
  await waitFor(() => expect(listSubjects).toHaveBeenCalled());
  expect(await screen.findByText("Add New Question")).toBeInTheDocument();
}

describe("CreateQuestionPage", () => {
  beforeEach(() => {
    listSubjects.mockReset();
    listAllExams.mockReset();
    getSubject.mockReset();
    listAllTags.mockReset();
    create.mockReset();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.mocked(message.error).mockClear();
    vi.mocked(message.success).mockClear();
  });

  it("loads catalog options into the form", async () => {
    await renderReady();
    expect(listAllExams).toHaveBeenCalled();
    expect(screen.getByPlaceholderText("Enter question text in English")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Option A in English")).toBeInTheDocument();
  });

  it("creates a question after catalogs, topics, and tags load", async () => {
    create.mockResolvedValue({
      message: "ok",
      data: {
        id: "q1",
        questionText: { en: { text: "Capital of India?" } },
        options: [],
        correctAnswer: "a",
        isActive: true,
      },
    });

    await renderReady();

    fireEvent.change(screen.getByPlaceholderText("Enter question text in English"), {
      target: { value: "Capital of India?" },
    });
    fireEvent.change(screen.getByPlaceholderText("Option A in English"), {
      target: { value: "Mumbai" },
    });
    fireEvent.change(screen.getByPlaceholderText("Option B in English"), {
      target: { value: "Delhi" },
    });
    fireEvent.change(screen.getByPlaceholderText("Option C in English"), {
      target: { value: "Kolkata" },
    });
    fireEvent.change(screen.getByPlaceholderText("Option D in English"), {
      target: { value: "Chennai" },
    });

    await chooseOption("Correct Answer", "Option A");
    await chooseOption("Subject", "History");
    await waitFor(() => expect(getSubject).toHaveBeenCalledWith("sub-1"));
    await chooseOption("Topic", "Ancient");
    await waitFor(() => expect(listAllTags).toHaveBeenCalled());
    await chooseOption("Difficulty Level", "Easy");

    fireEvent.click(screen.getByRole("button", { name: /add question/i }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        questionText: expect.objectContaining({
          en: expect.objectContaining({ text: "Capital of India?" }),
        }),
        optionType: "text",
        difficultyLevel: "easy",
        subject: "sub-1",
        topic: "top-1",
      })
    );
    expect(message.success).toHaveBeenCalled();
  });

  it("blocks image-option submit when images are missing", async () => {
    await renderReady();

    fireEvent.change(screen.getByPlaceholderText("Enter question text in English"), {
      target: { value: "Identify the monument" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "Image" }));

    await chooseOption("Correct Answer", "Option A");
    await chooseOption("Subject", "History");
    await waitFor(() => expect(getSubject).toHaveBeenCalled());
    await chooseOption("Topic", "Ancient");
    await chooseOption("Difficulty Level", "Easy");

    fireEvent.click(screen.getByRole("button", { name: /add question/i }));

    await waitFor(() =>
      expect(message.error).toHaveBeenCalledWith("Please upload images for all options")
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("surfaces catalog load errors", async () => {
    listSubjects.mockRejectedValue(new Error("nope"));
    listAllExams.mockRejectedValue(new Error("nope"));

    render(<CreateQuestionPage />);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("surfaces topic fetch errors when the subject changes", async () => {
    await renderReady();
    getSubject.mockRejectedValue(new Error("nope"));
    await chooseOption("Subject", "History");
    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("surfaces create errors", async () => {
    create.mockRejectedValue(new Error("nope"));
    await renderReady();

    fireEvent.change(screen.getByPlaceholderText("Enter question text in English"), {
      target: { value: "Capital of India?" },
    });
    fireEvent.change(screen.getByPlaceholderText("Option A in English"), {
      target: { value: "Mumbai" },
    });
    fireEvent.change(screen.getByPlaceholderText("Option B in English"), {
      target: { value: "Delhi" },
    });
    fireEvent.change(screen.getByPlaceholderText("Option C in English"), {
      target: { value: "Kolkata" },
    });
    fireEvent.change(screen.getByPlaceholderText("Option D in English"), {
      target: { value: "Chennai" },
    });
    await chooseOption("Correct Answer", "Option A");
    await chooseOption("Subject", "History");
    await waitFor(() => expect(getSubject).toHaveBeenCalled());
    await chooseOption("Topic", "Ancient");
    await chooseOption("Difficulty Level", "Easy");
    fireEvent.click(screen.getByRole("button", { name: /add question/i }));

    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });
});
