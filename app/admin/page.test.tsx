import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminDashboardSummary } from "@/app/services/ezprep-api";
import AdminDashboardPage from "./page";

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    adminDashboardApi: {
      getSummary: vi.fn(),
      getUsers: vi.fn(),
      getQuestions: vi.fn(),
      getFailedQuestions: vi.fn(),
      getMockTests: vi.fn(),
      getFullMockTests: vi.fn(),
      getAttempts: vi.fn(),
      getExams: vi.fn(),
      getSubjects: vi.fn(),
      getTopics: vi.fn(),
      getTags: vi.fn(),
    },
  };
});

import { adminDashboardApi } from "@/app/services/ezprep-api";

const getSummary = vi.mocked(adminDashboardApi.getSummary);
const getUsers = vi.mocked(adminDashboardApi.getUsers);
const getQuestions = vi.mocked(adminDashboardApi.getQuestions);
const getFailedQuestions = vi.mocked(adminDashboardApi.getFailedQuestions);
const getMockTests = vi.mocked(adminDashboardApi.getMockTests);
const getFullMockTests = vi.mocked(adminDashboardApi.getFullMockTests);
const getAttempts = vi.mocked(adminDashboardApi.getAttempts);
const getExams = vi.mocked(adminDashboardApi.getExams);
const getSubjects = vi.mocked(adminDashboardApi.getSubjects);
const getTopics = vi.mocked(adminDashboardApi.getTopics);
const getTags = vi.mocked(adminDashboardApi.getTags);

const summary: AdminDashboardSummary = {
  activeLearners: 12,
  activeQuestions: 100,
  failedQuestions: 3,
  mockTests: 5,
  fullMockTests: 2,
  attempts: 40,
  exams: 8,
  subjects: 6,
  topics: 20,
  tags: 15,
};

async function renderLoadedDashboard() {
  getSummary.mockResolvedValue({ message: "ok", data: summary });
  render(<AdminDashboardPage />);
  expect(await screen.findByText("Dashboard")).toBeInTheDocument();
}

async function openCard(label: string) {
  const button = screen.getAllByRole("button").find((node) =>
    [...node.querySelectorAll("p")].some((p) => p.textContent === label)
  );
  expect(button).toBeTruthy();
  fireEvent.click(button!);
}

describe("AdminDashboardPage", () => {
  beforeEach(() => {
    getSummary.mockReset();
    getUsers.mockReset();
    getQuestions.mockReset();
    getFailedQuestions.mockReset();
    getMockTests.mockReset();
    getFullMockTests.mockReset();
    getAttempts.mockReset();
    getExams.mockReset();
    getSubjects.mockReset();
    getTopics.mockReset();
    getTags.mockReset();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.mocked(message.error).mockClear();
  });

  it("shows a loader until the summary arrives", () => {
    getSummary.mockReturnValue(new Promise(() => {}));
    const { container } = render(<AdminDashboardPage />);
    expect(container.querySelector(".ant-spin")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("renders summary cards with counts", async () => {
    await renderLoadedDashboard();

    expect(screen.getByText("Active learners")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Active questions")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("Failed questions")).toBeInTheDocument();
    expect(screen.getByText("Mock tests")).toBeInTheDocument();
    expect(screen.getByText("Full mock tests")).toBeInTheDocument();
    expect(screen.getByText("Attempts")).toBeInTheDocument();
    expect(screen.getByText("Catalog")).toBeInTheDocument();
    expect(screen.getByText("Exams")).toBeInTheDocument();
    expect(screen.getByText("Subjects")).toBeInTheDocument();
    expect(screen.getByText("Topics")).toBeInTheDocument();
    expect(screen.getByText("Tags")).toBeInTheDocument();
  });

  it("opens a users modal with plan breakdown", async () => {
    getUsers.mockResolvedValue({
      message: "ok",
      data: {
        totalLearners: 20,
        activeLearners: 12,
        inactiveLearners: 8,
        newLast7Days: 2,
        newLast30Days: 5,
        byPlan: [{ plan: "premium", count: 7 }],
      },
    });

    await renderLoadedDashboard();
    await openCard("Active learners");

    expect(await screen.findByText("Total learners")).toBeInTheDocument();
    expect(screen.getByText("By plan")).toBeInTheDocument();
    expect(screen.getByText("premium")).toBeInTheDocument();
    expect(getUsers).toHaveBeenCalledTimes(1);
  });

  it("reuses cached detail data on a second click", async () => {
    getUsers.mockResolvedValue({
      message: "ok",
      data: {
        totalLearners: 20,
        activeLearners: 12,
        inactiveLearners: 8,
        newLast7Days: 2,
        newLast30Days: 5,
        byPlan: [],
      },
    });

    await renderLoadedDashboard();
    await openCard("Active learners");
    expect(await screen.findByText("Total learners")).toBeInTheDocument();

    fireEvent.click(document.querySelector(".ant-modal-close")!);
    await openCard("Active learners");

    expect(await screen.findByText("Total learners")).toBeInTheDocument();
    expect(getUsers).toHaveBeenCalledTimes(1);
  });

  it("opens questions detail with difficulty and topic tables", async () => {
    getQuestions.mockResolvedValue({
      message: "ok",
      data: {
        totalActive: 100,
        byDifficulty: [{ difficulty: "easy", count: 40 }],
        bySubjectAndTopic: [
          {
            subjectId: "s1",
            subjectName: "History",
            topicId: "t1",
            topicName: "Ancient",
            count: 9,
          },
        ],
      },
    });

    await renderLoadedDashboard();
    await openCard("Active questions");

    expect(await screen.findByText("easy")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Ancient")).toBeInTheDocument();
  });

  it("opens failed-questions, mock-tests, and full-mock-tests details", async () => {
    getFailedQuestions.mockResolvedValue({
      message: "ok",
      data: {
        total: 3,
        byStage: [{ name: "validation", count: 2 }],
        bySubject: [{ id: "s1", name: "Civics", count: 1 }],
      },
    });
    getMockTests.mockResolvedValue({
      message: "ok",
      data: { total: 5, byExam: [{ id: "e1", name: "UPSC", count: 5 }] },
    });
    getFullMockTests.mockResolvedValue({
      message: "ok",
      data: {
        totalPublished: 2,
        byExam: [{ name: "SSC", count: 2 }],
        draftsByStatus: [{ name: "REVIEW", count: 1 }],
      },
    });

    await renderLoadedDashboard();

    await openCard("Failed questions");
    expect(await screen.findByText("validation")).toBeInTheDocument();
    expect(screen.getByText("Civics")).toBeInTheDocument();
    fireEvent.click(document.querySelector(".ant-modal-close")!);

    await openCard("Mock tests");
    expect(await screen.findByText("UPSC")).toBeInTheDocument();
    fireEvent.click(document.querySelector(".ant-modal-close")!);

    await openCard("Full mock tests");
    expect(await screen.findByText("Drafts by status")).toBeInTheDocument();
    expect(screen.getByText("REVIEW")).toBeInTheDocument();
    expect(screen.getByText("SSC")).toBeInTheDocument();
  });

  it("opens attempts, exams, subjects, topics, and tags details", async () => {
    getAttempts.mockResolvedValue({
      message: "ok",
      data: {
        total: 40,
        submitted: 30,
        expired: 5,
        inProgress: 5,
        uniqueUsers: 10,
        timeConsumedSeconds: 100,
        timeConsumedLabel: "1h",
        byExam: [
          {
            examId: "e1",
            examName: "NEET",
            attempts: 12,
            uniqueUsers: 8,
            submitted: 10,
            expired: 1,
            inProgress: 1,
            timeConsumedSeconds: 50,
            timeConsumedLabel: "30m",
            allottedMinutes: 180,
          },
        ],
      },
    });
    getExams.mockResolvedValue({
      message: "ok",
      data: {
        totalActive: 8,
        totalInactive: 1,
        byCategory: [{ name: "Civil service", count: 4 }],
      },
    });
    getSubjects.mockResolvedValue({
      message: "ok",
      data: {
        totalActive: 6,
        rows: [{ id: "s1", name: "Polity", topicCount: 4, isActive: true }],
      },
    });
    getTopics.mockResolvedValue({
      message: "ok",
      data: {
        totalActive: 20,
        rows: [{ id: "t1", name: "Parliament", subjectId: "s1", subjectName: "Polity" }],
      },
    });
    getTags.mockResolvedValue({
      message: "ok",
      data: {
        totalActive: 15,
        rows: [
          {
            id: "g1",
            name: "Current",
            subjectId: "s1",
            subjectName: "Polity",
            topicName: "Parliament",
          },
        ],
      },
    });

    await renderLoadedDashboard();

    await openCard("Attempts");
    expect(await screen.findByText("NEET")).toBeInTheDocument();
    expect(screen.getByText("30m")).toBeInTheDocument();
    fireEvent.click(document.querySelector(".ant-modal-close")!);

    await openCard("Exams");
    expect(await screen.findByText("Civil service")).toBeInTheDocument();
    fireEvent.click(document.querySelector(".ant-modal-close")!);

    await openCard("Subjects");
    expect(await screen.findByText("Polity")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
    fireEvent.click(document.querySelector(".ant-modal-close")!);

    await openCard("Topics");
    expect(await screen.findByText("Parliament")).toBeInTheDocument();
    fireEvent.click(document.querySelector(".ant-modal-close")!);

    await openCard("Tags");
    expect(await screen.findByText("Current")).toBeInTheDocument();
  });

  it("shows a loader in the modal while details load", async () => {
    getUsers.mockReturnValue(new Promise(() => {}));
    await renderLoadedDashboard();
    await openCard("Active learners");
    expect(document.querySelector(".ant-modal")).toBeInTheDocument();
    expect(document.querySelector(".ant-modal .ant-spin")).toBeInTheDocument();
  });

  it("surfaces a summary fetch error and stays on the loader", async () => {
    getSummary.mockRejectedValue(new Error("nope"));
    render(<AdminDashboardPage />);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("surfaces a detail fetch error", async () => {
    getUsers.mockRejectedValue(new Error("boom"));
    await renderLoadedDashboard();
    await openCard("Active learners");

    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });
});
