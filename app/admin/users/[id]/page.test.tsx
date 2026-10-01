import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EzPrepApiError, type AppUserDetail } from "@/app/services/ezprep-api";
import UserDetailPage from "./page";

const { get } = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    usersApi: {
      get,
    },
  };
});

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    use: (value: unknown) => {
      if (value && typeof value === "object" && "then" in value) {
        const thenable = value as { value?: { id: string } };
        return thenable.value ?? { id: "u1" };
      }
      return actual.use(value as never);
    },
  };
});

function paramsPromise(id = "u1") {
  const value = { id };
  return {
    status: "fulfilled" as const,
    value,
    then(onFulfilled?: (next: { id: string }) => unknown) {
      return Promise.resolve(onFulfilled ? onFulfilled(value) : value);
    },
  } as unknown as Promise<{ id: string }>;
}

const emptyPaper = {
  finishedCount: 0,
  score: 0,
  totalMarks: 0,
  percentage: null,
  averagePercentage: null,
  bestPercentage: null,
  latestPercentage: null,
  accuracy: null,
  correct: 0,
  incorrect: 0,
  unanswered: 0,
  passedCount: 0,
  gradedCount: 0,
  trend: "insufficient" as const,
};

function makeDetail(overrides: Partial<AppUserDetail> = {}): AppUserDetail {
  return {
    profile: {
      id: "u1",
      name: "Anita Sharma",
      email: "anita.sharma@gmail.com",
      phoneNumber: "+919876543210",
      role: "user",
      isActive: true,
      gender: "female",
      location: { city: "Bengaluru", state: "KA", country: "IN", timezone: "Asia/Kolkata" },
      subscription: { plan: "premium", status: "active", autoRenew: true },
      membershipTier: "gold",
      badgesEarnedCount: 4,
      targetExam: { id: "e1", name: "UPSC" },
      bio: "Prelims this year",
      testsAttendedCount: 4,
      testActivity: {
        fullExam: { finished: 2, open: 1 },
        topicWise: { finished: 1, open: 0 },
        sprint: { finished: 0, open: 0 },
      },
      study: { studyTime: "morning", weeklyStudyGoalHours: 12 },
      createdAt: "2026-01-15T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    },
    recentTopicWiseAttempts: [
      {
        id: "t1",
        mockTestId: "paper-1",
        title: "Polity set",
        paperType: "TOPIC_WISE",
        status: "SUBMITTED",
        score: 42,
        totalMarks: 100,
        percentage: 42,
        correct: 42,
        incorrect: 8,
        unanswered: 0,
        totalQuestions: 50,
        passingScore: 40,
        passed: true,
        examName: "UPSC",
        subjectName: "Polity",
        topicName: "Constitution",
        timeConsumedSeconds: 1800,
        durationInMinutes: 60,
        submittedAt: "2026-03-12T04:30:00.000Z",
      },
      {
        id: "t2",
        mockTestId: "paper-2",
        title: "Unscored set",
        paperType: "TOPIC_WISE",
        status: "EXPIRED",
        score: 3,
        totalMarks: 0,
        percentage: null,
        correct: 0,
        incorrect: 0,
        unanswered: 5,
        totalQuestions: 5,
        passingScore: null,
        passed: null,
        examName: null,
        subjectName: null,
        topicName: null,
        timeConsumedSeconds: 30,
        durationInMinutes: 15,
      },
    ],
    recentFullExamAttempts: [
      {
        id: "f1",
        mockTestId: "paper-3",
        title: "Full prelims mock",
        paperType: "FULL_EXAM",
        status: "SUBMITTED",
        score: 86,
        totalMarks: 200,
        percentage: 43,
        correct: 90,
        incorrect: 40,
        unanswered: 20,
        totalQuestions: 150,
        passingScore: 90,
        passed: false,
        examName: "UPSC",
        subjectName: null,
        topicName: null,
        timeConsumedSeconds: 7200,
        durationInMinutes: 120,
        submittedAt: "2026-04-02T02:00:00.000Z",
      },
    ],
    recentSprintAttempts: [],
    analysis: {
      topicWise: {
        ...emptyPaper,
        finishedCount: 2,
        score: 45,
        totalMarks: 100,
        percentage: 45,
        averagePercentage: 42,
        bestPercentage: 42,
        latestPercentage: 42,
        accuracy: 84,
        correct: 42,
        incorrect: 8,
        unanswered: 5,
        trend: "insufficient",
      },
      fullExam: {
        ...emptyPaper,
        finishedCount: 1,
        score: 86,
        totalMarks: 200,
        percentage: 43,
        averagePercentage: 43,
        bestPercentage: 43,
        latestPercentage: 43,
        accuracy: 69.2,
        correct: 90,
        incorrect: 40,
        unanswered: 20,
        passedCount: 0,
        gradedCount: 1,
        trend: "insufficient",
      },
      sprint: emptyPaper,
      overall: {
        ...emptyPaper,
        finishedCount: 3,
        score: 131,
        totalMarks: 300,
        percentage: 43.7,
        averagePercentage: 42.5,
        bestPercentage: 43,
        latestPercentage: 43,
        accuracy: 73.3,
        correct: 132,
        incorrect: 48,
        unanswered: 25,
        trend: "steady",
      },
    },
    ...overrides,
  };
}

function renderPage(id = "u1") {
  return render(<UserDetailPage params={paramsPromise(id)} />);
}

describe("UserDetailPage", () => {
  beforeEach(() => {
    get.mockReset();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.mocked(message.error).mockClear();
  });

  it("shows the learner profile, scores, and recent finished attempts", async () => {
    get.mockResolvedValue({ message: "ok", data: makeDetail() });

    renderPage();

    expect(await screen.findByRole("heading", { name: "Anita Sharma" })).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("u1");
    expect(screen.getByRole("link", { name: /learners/i })).toHaveAttribute(
      "href",
      "/admin/users"
    );
    expect(screen.getByText("a***@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("+91**********")).toBeInTheDocument();
    expect(screen.queryByText("anita.sharma@gmail.com")).not.toBeInTheDocument();
    expect(screen.queryByText("+919876543210")).not.toBeInTheDocument();
    expect(screen.getByText("Prelims this year")).toBeInTheDocument();
    expect(screen.getByText("Bengaluru, KA, IN")).toBeInTheDocument();
    expect(screen.getByText("Asia/Kolkata")).toBeInTheDocument();
    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByText("12 hours / week")).toBeInTheDocument();
    expect(screen.getByText("4 badges")).toBeInTheDocument();
    expect(screen.getByText(/Scores use finished tests only/)).toBeInTheDocument();
    expect(screen.getByText(/43\.7% across 131 \/ 300/)).toBeInTheDocument();
    expect(screen.getByText(/Recent scores are holding steady\./)).toBeInTheDocument();

    const topic = screen.getByTestId("topic-attempts");
    expect(
      within(topic).getByText(/Score on each of the last 5 finished topic tests/i)
    ).toBeInTheDocument();
    expect(within(topic).getByText("Polity set")).toBeInTheDocument();
    expect(within(topic).getByText("42 / 100")).toBeInTheDocument();
    expect(within(topic).getAllByText("Score").length).toBeGreaterThan(0);
    expect(within(topic).getByText("Passed")).toBeInTheDocument();
    expect(within(topic).getByText("Unscored set")).toBeInTheDocument();
    expect(within(topic).getByText("3")).toBeInTheDocument();
    expect(within(topic).getByText("Time expired")).toBeInTheDocument();
    expect(within(topic).queryByText(/\/ 0/)).not.toBeInTheDocument();

    const full = screen.getByTestId("full-exam-attempts");
    expect(within(full).getByText("Full prelims mock")).toBeInTheDocument();
    expect(within(full).getByText("86 / 200")).toBeInTheDocument();
    expect(within(full).getByText("Not passed")).toBeInTheDocument();
    expect(within(full).getByText("1 finished test")).toBeInTheDocument();
    expect(within(topic).getByText("All 2 finished tests")).toBeInTheDocument();
  });

  it("shows empty attempt sections when the learner has no finished tests", async () => {
    get.mockResolvedValue({
      message: "ok",
      data: makeDetail({
        recentTopicWiseAttempts: [],
        recentFullExamAttempts: [],
        analysis: {
          topicWise: emptyPaper,
          fullExam: emptyPaper,
          sprint: emptyPaper,
          overall: emptyPaper,
        },
      }),
    });

    renderPage();

    expect(await screen.findByText("Anita Sharma")).toBeInTheDocument();
    expect(screen.getByText("No finished tests yet.")).toBeInTheDocument();
    expect(screen.getByText("No finished topic tests yet.")).toBeInTheDocument();
    expect(screen.getByText("No finished full mocks yet.")).toBeInTheDocument();
    expect(screen.getByText("This learner has not finished a topic test.")).toBeInTheDocument();
    expect(screen.getByText("This learner has not finished a full mock.")).toBeInTheDocument();
    expect(screen.queryByTestId("finished-attempt")).not.toBeInTheDocument();
  });

  it("renders fewer than five attempts without padding the list", async () => {
    get.mockResolvedValue({
      message: "ok",
      data: makeDetail({
        recentFullExamAttempts: [],
        analysis: {
          ...makeDetail().analysis,
          fullExam: emptyPaper,
          overall: {
            ...makeDetail().analysis.overall,
            finishedCount: 2,
          },
        },
      }),
    });

    renderPage();

    expect(await screen.findByText("Polity set")).toBeInTheDocument();
    expect(screen.getByText("Unscored set")).toBeInTheDocument();
    expect(screen.queryByText("Full prelims mock")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("finished-attempt")).toHaveLength(2);
    expect(screen.getByText("This learner has not finished a full mock.")).toBeInTheDocument();
  });

  it("shows a not-found state without an error toast", async () => {
    get.mockRejectedValue(
      new EzPrepApiError("missing", 404, "/v1/admin/users/u1", { message: "Learner not found" })
    );

    renderPage();

    expect(await screen.findByText("This learner could not be found.")).toBeInTheDocument();
    expect(message.error).not.toHaveBeenCalled();
    expect(screen.queryByTestId("user-detail")).not.toBeInTheDocument();
  });

  it("surfaces other API failures and can retry", async () => {
    get
      .mockRejectedValueOnce(new Error("nope"))
      .mockResolvedValueOnce({ message: "ok", data: makeDetail() });

    renderPage();

    expect(await screen.findByText("Could not load this learner")).toBeInTheDocument();
    await waitFor(() => expect(message.error).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByText("Anita Sharma")).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("ignores a stale response after a newer fetch", async () => {
    let resolveSlow: ((value: unknown) => void) | undefined;
    const slow = new Promise((resolve) => {
      resolveSlow = resolve;
    });
    get.mockReturnValueOnce(slow).mockResolvedValueOnce({
      message: "ok",
      data: makeDetail({
        profile: { ...makeDetail().profile, id: "u2", name: "Bala Rao" },
      }),
    });

    const { rerender } = renderPage("u1");
    rerender(<UserDetailPage params={paramsPromise("u2")} />);

    expect(await screen.findByText("Bala Rao")).toBeInTheDocument();
    resolveSlow?.({
      message: "ok",
      data: makeDetail({
        profile: { ...makeDetail().profile, name: "Stale Anita" },
      }),
    });

    await waitFor(() => expect(screen.getByText("Bala Rao")).toBeInTheDocument());
    expect(screen.queryByText("Stale Anita")).not.toBeInTheDocument();
  });
});
