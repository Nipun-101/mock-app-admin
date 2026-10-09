import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SprintTestsPage from "./page";

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
    listAllExams: vi.fn(),
  },
}));

vi.mock("./api", () => ({
  formatEzPrepError: (_error: unknown, fallback: string) => fallback,
  sprintTestsApi: {
    createDraft: vi.fn(),
    listDrafts: vi.fn(),
    listPublished: vi.fn(),
    discardDraft: vi.fn(),
    deletePublished: vi.fn(),
  },
}));

import { catalogApi } from "@/app/services/ezprep-api";
import { sprintTestsApi } from "./api";

const listAllExams = vi.mocked(catalogApi.listAllExams);
const createDraft = vi.mocked(sprintTestsApi.createDraft);
const listDrafts = vi.mocked(sprintTestsApi.listDrafts);
const listPublished = vi.mocked(sprintTestsApi.listPublished);

beforeEach(() => {
  router.push.mockReset();
  listAllExams.mockReset().mockResolvedValue([
    {
      id: "e1",
      name: "SSC CGL",
      isSessionWise: false,
      hasMultiLingualSupport: false,
      trending: false,
      isActive: true,
      category: "c1",
      examGroup: "g1",
    },
  ]);
  listDrafts.mockReset().mockResolvedValue({
    message: "ok",
    data: [
      {
        id: "draft-1",
        examId: "e1",
        examName: "CGL",
        status: "REVIEW",
        totalQuestions: 10,
        durationInMinutes: 15,
        title: "Morning sprint",
        createdAt: "",
        updatedAt: "",
      },
    ],
    pagination: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPrevPage: false },
  });
  listPublished.mockReset().mockResolvedValue({
    message: "ok",
    data: [
      {
        id: "sp-1",
        title: "Published sprint",
        totalQuestions: 10,
        durationInMinutes: 10,
        exam: { id: "e1", name: "CGL" },
        marksPerQuestion: 1,
        negativeMarking: 0,
        allowRetake: true,
        shuffleOptions: false,
        showResultsImmediately: true,
        isActive: true,
      },
    ],
    pagination: { total: 1, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPrevPage: false },
  });
  createDraft.mockReset();
  vi.spyOn(message, "success").mockImplementation(
    (() => undefined) as unknown as typeof message.success
  );
  vi.spyOn(message, "error").mockImplementation(
    (() => undefined) as unknown as typeof message.error
  );
});

describe("SprintTestsPage", () => {
  it("creates a draft from exam, size, and duration without subject or topic", async () => {
    createDraft.mockResolvedValue({
      message: "created",
      data: {
        id: "draft-9",
        examId: "e1",
        examName: "CGL",
        status: "REVIEW",
        settings: {
          totalQuestions: 10,
          durationInMinutes: 15,
          marksPerQuestion: 1,
          negativeMarking: 0,
          allowRetake: true,
          shuffleOptions: false,
          showResultsImmediately: true,
        },
        subjects: [],
        createdAt: "",
        updatedAt: "",
      },
    });

    render(<SprintTestsPage />);
    expect(screen.queryByText("Subject")).not.toBeInTheDocument();
    expect(screen.queryByText("Topic")).not.toBeInTheDocument();
    expect(await screen.findByText("Morning sprint")).toBeInTheDocument();
    expect(screen.getByText("Published sprint")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("combobox", { name: /exam/i }));
    fireEvent.click(await screen.findByText("SSC CGL"));
    const questionSelect = screen.getAllByRole("combobox")[1];
    fireEvent.mouseDown(questionSelect);
    fireEvent.click(await screen.findByText("10 Questions"));
    const durationSelect = screen.getAllByRole("combobox")[2];
    fireEvent.mouseDown(durationSelect);
    fireEvent.click(await screen.findByText("15 Minutes"));
    fireEvent.click(screen.getByRole("button", { name: /create draft/i }));

    await waitFor(() => {
      expect(createDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          examId: "e1",
          totalQuestions: 10,
          durationInMinutes: 15,
          accessMode: "FREE",
        })
      );
    });
    expect(router.push).toHaveBeenCalledWith("/admin/sprint-tests/drafts/draft-9");
  });

  it("opens a draft for review and a published paper", async () => {
    render(<SprintTestsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Review" }));
    expect(router.push).toHaveBeenCalledWith("/admin/sprint-tests/drafts/draft-1");
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(router.push).toHaveBeenCalledWith("/admin/sprint-tests/sp-1");
  });
});
