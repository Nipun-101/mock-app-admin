import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublishedFullMockPage from "./page";
import type { FullMockTestListItem } from "../types";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
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

import { fullMockApi } from "../api";

const getPublished = vi.mocked(fullMockApi.getPublished);

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

function renderPage() {
  return render(<PublishedFullMockPage params={paramsPromise()} />);
}

const testItem: FullMockTestListItem = {
  id: "id-1",
  title: "UPSC Full Mock 1",
  description: "Full paper",
  totalQuestions: 100,
  durationInMinutes: 120,
  totalMarks: 200,
  isSessionWise: true,
  exam: { id: "ex-1", name: "UPSC Prelims" },
  subjectConfig: [
    {
      subject: "sub-1",
      name: "Polity",
      numberOfQuestions: 20,
      marksPerQuestion: 2,
      hasNegativeMarking: true,
      negativeMarksPerQuestion: 0.66,
      sessionTime: 30,
      questionStartIndex: 0,
      questionEndIndex: 19,
    },
    {
      subject: "sub-2",
      name: "History",
      numberOfQuestions: 20,
      marksPerQuestion: 2,
      hasNegativeMarking: false,
      negativeMarksPerQuestion: 0,
      questionStartIndex: 20,
      questionEndIndex: 39,
    },
  ],
  marksPerQuestion: 2,
  negativeMarking: 0.66,
  passingScore: 70,
  allowRetake: true,
  shuffleOptions: false,
  showResultsImmediately: true,
  isActive: true,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("PublishedFullMockPage", () => {
  beforeEach(() => {
    getPublished.mockReset();
    push.mockReset();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.mocked(message.error).mockClear();
  });

  it("shows a loader while fetching", async () => {
    getPublished.mockReturnValue(new Promise(() => {}));
    renderPage();
    await waitFor(() => expect(document.querySelector(".ant-spin")).toBeInTheDocument());
  });

  it("renders published full mock details and subjects", async () => {
    getPublished.mockResolvedValue({ message: "ok", data: testItem });
    renderPage();

    expect(await screen.findAllByText("UPSC Full Mock 1")).not.toHaveLength(0);
    expect(screen.getByText("Session-wise")).toBeInTheDocument();
    expect(screen.getByText("UPSC Prelims")).toBeInTheDocument();
    expect(screen.getByText("Subjects (2)")).toBeInTheDocument();
    expect(screen.getByText("Polity")).toBeInTheDocument();
    expect(screen.getByText("-0.66")).toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument();
    expect(screen.getByText("30 mins")).toBeInTheDocument();
    expect(screen.getByText("Q1–Q20")).toBeInTheDocument();
    expect(getPublished).toHaveBeenCalledWith("id-1");
  });

  it("falls back when optional fields are missing", async () => {
    getPublished.mockResolvedValue({
      message: "ok",
      data: {
        ...testItem,
        title: undefined,
        exam: null,
        isSessionWise: false,
        isActive: false,
        totalMarks: undefined,
        passingScore: undefined,
        description: undefined,
        createdAt: "",
        allowRetake: false,
        shuffleOptions: true,
        showResultsImmediately: false,
        subjectConfig: [],
      },
    });

    renderPage();

    expect(await screen.findByText("Full Mock Test")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByText("Mixed")).toBeInTheDocument();
    expect(screen.getByText("No description")).toBeInTheDocument();
    expect(screen.getByText("Subjects (0)")).toBeInTheDocument();
  });

  it("navigates back to the list", async () => {
    getPublished.mockResolvedValue({ message: "ok", data: testItem });
    renderPage();
    await screen.findAllByText("UPSC Full Mock 1");
    fireEvent.click(screen.getByRole("button", { name: /back to full mock tests/i }));
    expect(push).toHaveBeenCalledWith("/admin/full-mock-tests");
  });

  it("redirects when fetch fails", async () => {
    getPublished.mockRejectedValue(new Error("nope"));
    renderPage();
    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith("/admin/full-mock-tests");
  });
});
