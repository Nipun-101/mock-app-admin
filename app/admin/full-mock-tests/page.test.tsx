import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FullMockTestsPage from "./page";
import type { FullMockExamListItem, FullMockTestListItem } from "./types";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return {
    ...actual,
    fullMockApi: {
      listExams: vi.fn(),
      listPublished: vi.fn(),
      createDraft: vi.fn(),
      getDraft: vi.fn(),
      getPublished: vi.fn(),
      searchQuestions: vi.fn(),
      replaceQuestion: vi.fn(),
      publishDraft: vi.fn(),
      discardDraft: vi.fn(),
    },
  };
});

import { fullMockApi } from "./api";

const listExams = vi.mocked(fullMockApi.listExams);
const listPublished = vi.mocked(fullMockApi.listPublished);
const createDraft = vi.mocked(fullMockApi.createDraft);

const exam: FullMockExamListItem = {
  id: "ex-1",
  examName: "UPSC Prelims",
  duration: "120 mins",
  questions: 100,
  totalMarks: 200,
  category: "Civil service",
  examGroup: "UPSC",
  subjects: ["Polity", "History"],
  mode: "Mixed",
};

const published: FullMockTestListItem = {
  id: "fm-1",
  title: "UPSC Full Mock 1",
  totalQuestions: 100,
  durationInMinutes: 120,
  totalMarks: 200,
  isSessionWise: false,
  exam: { id: "ex-1", name: "UPSC Prelims" },
  subjectConfig: [],
  marksPerQuestion: 2,
  negativeMarking: 0.66,
  allowRetake: true,
  shuffleOptions: false,
  showResultsImmediately: true,
  isActive: true,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const pagination = { total: 1, page: 1, limit: 10, totalPages: 1 };

async function renderReady() {
  listExams.mockResolvedValue({ message: "ok", data: [exam], pagination });
  listPublished.mockResolvedValue({
    message: "ok",
    data: [published],
    pagination,
  });
  render(<FullMockTestsPage />);
  expect(await screen.findAllByText("UPSC Prelims")).not.toHaveLength(0);
  expect(await screen.findByText("UPSC Full Mock 1")).toBeInTheDocument();
}

describe("FullMockTestsPage", () => {
  beforeEach(() => {
    listExams.mockReset();
    listPublished.mockReset();
    createDraft.mockReset();
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

  it("lists exams and published full mocks", async () => {
    await renderReady();
    expect(screen.getByText("Full Mock Tests")).toBeInTheDocument();
    expect(screen.getByText("Polity, History")).toBeInTheDocument();
    expect(screen.getByText("UPSC Full Mock 1")).toBeInTheDocument();
  });

  it("searches exams", async () => {
    await renderReady();
    const search = screen.getByPlaceholderText("Search exams");
    fireEvent.change(search, { target: { value: "upsc" } });
    fireEvent.keyDown(search, { key: "Enter", code: "Enter" });

    await waitFor(() =>
      expect(listExams).toHaveBeenCalledWith(
        expect.objectContaining({ search: "upsc", page: 1 })
      )
    );
  });

  it("generates a draft and navigates to it", async () => {
    createDraft.mockResolvedValue({
      message: "Draft generated",
      data: {
        id: "draft-1",
        examId: "ex-1",
        status: "REVIEW",
        examSnapshot: { name: "UPSC Prelims", totalQuestions: 100, isSessionWise: false },
        subjects: [],
        createdAt: "",
        updatedAt: "",
      },
    });
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    expect(await screen.findByText("Generating full mock draft")).toBeInTheDocument();
    await waitFor(() => expect(createDraft).toHaveBeenCalledWith("ex-1"));
    expect(message.success).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/admin/full-mock-tests/drafts/draft-1");
  });

  it("surfaces a generate error", async () => {
    createDraft.mockRejectedValue(new Error("nope"));
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));
    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("navigates to a published test", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(push).toHaveBeenCalledWith("/admin/full-mock-tests/fm-1");
  });

  it("shows empty published text", async () => {
    listExams.mockResolvedValue({ message: "ok", data: [], pagination: { ...pagination, total: 0 } });
    listPublished.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });
    render(<FullMockTestsPage />);
    expect(await screen.findByText("No published full mocks yet")).toBeInTheDocument();
  });

  it("surfaces exam and published fetch errors", async () => {
    listExams.mockRejectedValue(new Error("nope"));
    listPublished.mockRejectedValue(new Error("nope"));
    render(<FullMockTestsPage />);
    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });
});
