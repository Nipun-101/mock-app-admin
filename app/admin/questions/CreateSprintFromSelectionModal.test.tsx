import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateSprintFromSelectionModal } from "./CreateSprintFromSelectionModal";
import type { SelectedSprintQuestion } from "./sprint-selection";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/app/admin/sprint-tests/api", () => ({
  formatEzPrepError: (_error: unknown, fallback: string) => fallback,
  sprintTestsApi: {
    createDraft: vi.fn(),
  },
}));

import { sprintTestsApi } from "@/app/admin/sprint-tests/api";

const createDraft = vi.mocked(sprintTestsApi.createDraft);

function questions(): SelectedSprintQuestion[] {
  return Array.from({ length: 10 }, (_, index) => ({
    id: `q-${index + 1}`,
    snippet: `Stem ${index + 1}`,
    examIds: ["e1"],
    isActive: true,
  }));
}

beforeEach(() => {
  push.mockReset();
  createDraft.mockReset();
  vi.spyOn(message, "success").mockImplementation(
    (() => undefined) as unknown as typeof message.success
  );
  vi.spyOn(message, "error").mockImplementation(
    (() => undefined) as unknown as typeof message.error
  );
});

describe("CreateSprintFromSelectionModal", () => {
  it("creates a draft from the selected question ids and opens review", async () => {
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

    render(
      <CreateSprintFromSelectionModal
        open
        questions={questions()}
        exams={[{ id: "e1", name: "SSC CGL" }]}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    expect(screen.getByText("Stem 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create draft/i })).toBeDisabled();
    fireEvent.mouseDown(screen.getByRole("combobox", { name: /exam/i }));
    fireEvent.click(await screen.findByText("SSC CGL"));
    fireEvent.mouseDown(screen.getAllByRole("combobox")[1]);
    fireEvent.click(await screen.findByText("15 Minutes"));
    fireEvent.click(screen.getByRole("button", { name: /create draft/i }));

    await waitFor(() => {
      expect(createDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          examId: "e1",
          totalQuestions: 10,
          durationInMinutes: 15,
          questionIds: questions().map((question) => question.id),
          accessMode: "FREE",
        })
      );
    });
    expect(push).toHaveBeenCalledWith("/admin/sprint-tests/drafts/draft-9");
  });

  it("blocks submit when the selection does not share an exam", () => {
    render(
      <CreateSprintFromSelectionModal
        open
        questions={[
          { id: "q-1", snippet: "A", examIds: ["e1"], isActive: true },
          { id: "q-2", snippet: "B", examIds: ["e2"], isActive: true },
        ]}
        exams={[
          { id: "e1", name: "CGL" },
          { id: "e2", name: "CHSL" },
        ]}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    expect(screen.getByText("These questions do not share an exam tag")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create draft/i })).toBeDisabled();
  });
});
