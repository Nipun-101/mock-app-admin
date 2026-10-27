import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateTopicWiseFromSelectionModal } from "./CreateTopicWiseFromSelectionModal";
import type { SelectedSprintQuestion } from "./sprint-selection";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/app/admin/mock-tests/api", () => ({
  formatEzPrepError: (_error: unknown, fallback: string) => fallback,
  topicWiseDraftsApi: {
    createDraft: vi.fn(),
  },
}));

import { topicWiseDraftsApi } from "@/app/admin/mock-tests/api";

const createDraft = vi.mocked(topicWiseDraftsApi.createDraft);

function questions(): SelectedSprintQuestion[] {
  return Array.from({ length: 10 }, (_, index) => ({
    id: `q-${index + 1}`,
    snippet: `Stem ${index + 1}`,
    subjectId: "sub-1",
    subjectName: "Polity",
    topicId: "top-1",
    topicName: "Parliament",
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

describe("CreateTopicWiseFromSelectionModal", () => {
  it("creates a draft from the selected question ids and opens review", async () => {
    createDraft.mockResolvedValue({
      message: "created",
      data: { id: "draft-9" } as never,
    });

    render(
      <CreateTopicWiseFromSelectionModal
        open
        questions={questions()}
        exams={[{ id: "e1", name: "SSC CGL" }]}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    expect(screen.getByText("Polity")).toBeInTheDocument();
    expect(screen.getByText("Parliament")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create draft/i })).toBeDisabled();
    fireEvent.mouseDown(screen.getByRole("combobox", { name: /exam/i }));
    fireEvent.click(await screen.findByText("SSC CGL"));
    fireEvent.mouseDown(screen.getAllByRole("combobox")[1]);
    fireEvent.click(await screen.findByText("15 Minutes"));
    fireEvent.click(screen.getByRole("button", { name: /create draft/i }));

    await waitFor(() => {
      expect(createDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          exam: "e1",
          totalQuestions: 10,
          durationInMinutes: 15,
          questionIds: questions().map((question) => question.id),
          accessMode: "FREE",
        })
      );
    });
    expect(createDraft.mock.calls[0][0].subject).toBeUndefined();
    expect(push).toHaveBeenCalledWith("/admin/mock-tests/drafts/draft-9");
  });
});
