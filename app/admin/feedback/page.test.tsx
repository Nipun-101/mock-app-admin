import { render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FeedbackItem, FeedbackSummary } from "@/app/services/ezprep-api/feedback";
import FeedbackPage from "./page";

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    feedbackApi: {
      summary: vi.fn(),
      list: vi.fn(),
    },
  };
});

import { feedbackApi } from "@/app/services/ezprep-api";

const summary = vi.mocked(feedbackApi.summary);
const list = vi.mocked(feedbackApi.list);

function makeSummary(overrides: Partial<FeedbackSummary> = {}): FeedbackSummary {
  return {
    feedbackCount: 2,
    overall: 4.5,
    ratedCount: 3,
    userInterface: { average: 4.5, count: 2 },
    questions: { average: null, count: 0 },
    fullMockTests: { average: 5, count: 1 },
    topicWisePractice: { average: null, count: 0 },
    easeOfUse: { average: 4, count: 1 },
    ...overrides,
  };
}

function makeItem(overrides: Partial<FeedbackItem> = {}): FeedbackItem {
  return {
    id: "f1",
    text: "The timer feels jumpy",
    ratings: { userInterface: 4, easeOfUse: 5 },
    user: { id: "u1", name: "Ada Lovelace", email: "ada@example.com" },
    createdAt: "2026-04-01T10:30:00.000Z",
    ...overrides,
  };
}

const pagination = {
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

describe("FeedbackPage", () => {
  beforeEach(() => {
    summary.mockReset();
    list.mockReset();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.mocked(message.error).mockClear();
  });

  it("shows the overall rating and a submission", async () => {
    summary.mockResolvedValue({ message: "ok", data: makeSummary() });
    list.mockResolvedValue({
      message: "ok",
      data: [makeItem()],
      pagination,
    });

    render(<FeedbackPage />);

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("a***@example.com")).toBeInTheDocument();
    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();
    expect(screen.getByText("The timer feels jumpy")).toBeInTheDocument();
    expect(screen.getAllByText("4.5").length).toBeGreaterThan(0);
    expect(screen.getByText("2 submissions")).toBeInTheDocument();
    expect(screen.getByText(/Showing 1 of 1 submission/)).toBeInTheDocument();

    const card = screen.getByText("The timer feels jumpy").closest("article");
    expect(card).toHaveTextContent("User interface");
    expect(card).toHaveTextContent("Ease of use");
    expect(card).not.toHaveTextContent("Questions");

    expect(summary).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it("shows an empty list when nobody has submitted feedback", async () => {
    summary.mockResolvedValue({
      message: "ok",
      data: makeSummary({
        feedbackCount: 0,
        overall: null,
        ratedCount: 0,
        userInterface: { average: null, count: 0 },
        fullMockTests: { average: null, count: 0 },
        easeOfUse: { average: null, count: 0 },
      }),
    });
    list.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0, totalPages: 0 },
    });

    render(<FeedbackPage />);

    expect(
      await screen.findByText("No feedback yet. Submissions from learners will show up here.")
    ).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("reports a list failure", async () => {
    summary.mockResolvedValue({ message: "ok", data: makeSummary() });
    list.mockRejectedValue(new Error("down"));

    render(<FeedbackPage />);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith("Failed to load feedback");
    });
    expect(
      screen.getByText("No feedback yet. Submissions from learners will show up here.")
    ).toBeInTheDocument();
  });
});
