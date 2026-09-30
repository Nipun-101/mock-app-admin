import { describe, expect, it } from "vitest";
import type { AppUserDetail, FinishedAttempt } from "@/app/services/ezprep-api/users";
import {
  formatDuration,
  formatPercent,
  formatScoreLine,
  normalizeUserDetail,
  performanceSummary,
  recentAttemptsCaption,
} from "./details-helpers";

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

function attempt(
  overrides: Partial<Omit<FinishedAttempt, "status">> & { status?: string } = {}
): FinishedAttempt {
  return {
    id: "a1",
    mockTestId: "m1",
    title: "Polity set",
    paperType: "TOPIC_WISE",
    status: "SUBMITTED",
    score: 40,
    totalMarks: 100,
    percentage: 40,
    correct: 8,
    incorrect: 2,
    unanswered: 0,
    totalQuestions: 10,
    passingScore: 35,
    passed: true,
    examName: "UPSC",
    subjectName: "Polity",
    topicName: "Constitution",
    timeConsumedSeconds: 90,
    durationInMinutes: 20,
    startedAt: "2026-03-01T10:00:00.000Z",
    submittedAt: "2026-03-01T10:20:00.000Z",
    ...overrides,
  } as FinishedAttempt;
}

function detail(overrides: Partial<AppUserDetail> = {}): AppUserDetail {
  return {
    profile: {
      id: "u1",
      name: "Anita Sharma",
      email: "anita.sharma@gmail.com",
      phoneNumber: "+919876543210",
      role: "user",
      isActive: true,
      testsAttendedCount: 1,
      createdAt: "2026-01-15T00:00:00.000Z",
      updatedAt: "2026-01-16T00:00:00.000Z",
    },
    recentTopicWiseAttempts: [attempt()],
    recentFullExamAttempts: [],
    analysis: {
      topicWise: { ...emptyPaper, finishedCount: 1, score: 40, totalMarks: 100, percentage: 40 },
      fullExam: emptyPaper,
      overall: { ...emptyPaper, finishedCount: 1, score: 40, totalMarks: 100, percentage: 40 },
    },
    ...overrides,
  };
}

describe("score and duration formatting", () => {
  it("shows marks out of the total, and score alone when the total is missing", () => {
    expect(formatScoreLine(42, 100)).toBe("42 / 100");
    expect(formatScoreLine(0.25, 2)).toBe("0.25 / 2");
    expect(formatScoreLine(4, 0)).toBe("4");
    expect(formatScoreLine(-2, 10)).toBe("-2 / 10");
    expect(formatPercent(33.34)).toBe("33.3%");
    expect(formatPercent(null)).toBe("—");
  });

  it("formats time spent without dropping short attempts", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(90)).toBe("1m 30s");
    expect(formatDuration(3600)).toBe("1h 0m");
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(-1)).toBeNull();
  });
});

describe("recent attempt captions and summaries", () => {
  it("describes a short list and a capped list", () => {
    expect(recentAttemptsCaption(0, 0)).toBeNull();
    expect(recentAttemptsCaption(1, 1)).toBe("1 finished test");
    expect(recentAttemptsCaption(2, 2)).toBe("All 2 finished tests");
    expect(recentAttemptsCaption(5, 12)).toBe("Latest 5 of 12 finished");
  });

  it("summarises marks, totals, and recent form", () => {
    expect(
      performanceSummary(emptyPaper, { singular: "topic test", plural: "topic tests" })
    ).toBe("No finished topic tests yet.");
    expect(
      performanceSummary(
        {
          ...emptyPaper,
          finishedCount: 1,
          score: 40,
          totalMarks: 100,
          percentage: 40,
          trend: "insufficient",
        },
        { singular: "topic test", plural: "topic tests" }
      )
    ).toBe(
      "1 finished topic test. 40% across 40 / 100. Not enough scored tests to judge recent form."
    );
    expect(
      performanceSummary(
        {
          ...emptyPaper,
          finishedCount: 3,
          score: 10,
          totalMarks: 0,
          percentage: null,
          trend: "improving",
        },
        { singular: "test", plural: "tests" }
      )
    ).toContain("Recent scores are improving.");
  });
});

describe("normalizeUserDetail", () => {
  it("masks contact details and keeps finished attempts", () => {
    const normalized = normalizeUserDetail(detail());

    expect(normalized?.profile.email).toBe("a***@gmail.com");
    expect(normalized?.profile.phoneNumber).toBe("+91**********");
    expect(normalized?.profile.role).toBe("user");
    expect(JSON.stringify(normalized)).not.toContain("anita.sharma@gmail.com");
    expect(JSON.stringify(normalized)).not.toContain("+919876543210");
    expect(normalized?.recentTopicWiseAttempts).toHaveLength(1);
    expect(normalized?.recentTopicWiseAttempts[0]).toMatchObject({
      score: 40,
      totalMarks: 100,
      percentage: 40,
    });
  });

  it("rejects admin payloads and missing profiles", () => {
    expect(
      normalizeUserDetail(
        detail({
          profile: {
            ...detail().profile,
            role: "admin" as "user",
            name: "Root",
          },
        })
      )
    ).toBeNull();
    expect(normalizeUserDetail(null)).toBeNull();
    expect(normalizeUserDetail({ profile: { ...detail().profile, id: "  " } })).toBeNull();
  });

  it("keeps at most five finished tests and drops open or misplaced attempts", () => {
    const topic = Array.from({ length: 6 }, (_, index) =>
      attempt({ id: `t${index}` })
    );
    const normalized = normalizeUserDetail(
      detail({
        recentTopicWiseAttempts: [
          ...topic,
          attempt({ id: "open", status: "IN_PROGRESS" }),
          attempt({ id: "full", paperType: "FULL_EXAM" }),
          attempt({ id: "", title: "Missing id" }),
        ],
        recentFullExamAttempts: [
          attempt({ id: "topic", paperType: "TOPIC_WISE" }),
          attempt({
            id: "mock",
            paperType: "FULL_EXAM",
            title: "  ",
            score: 3,
            totalMarks: 0,
            percentage: 99,
          }),
        ],
      })
    );

    expect(normalized?.recentTopicWiseAttempts).toHaveLength(5);
    expect(normalized?.recentTopicWiseAttempts.map((row) => row.id)).not.toContain("open");
    expect(normalized?.recentTopicWiseAttempts.map((row) => row.id)).not.toContain("full");
    expect(normalized?.recentFullExamAttempts).toEqual([
      expect.objectContaining({
        id: "mock",
        title: "Untitled test",
        percentage: null,
        totalMarks: 0,
        score: 3,
      }),
    ]);
  });

  it("does not carry secrets through from a loose payload", () => {
    const normalized = normalizeUserDetail({
      profile: {
        ...detail().profile,
        passwordHash: "secret",
        username: "root",
      } as AppUserDetail["profile"],
    });

    expect(normalized?.profile).not.toHaveProperty("passwordHash");
    expect(normalized?.profile).not.toHaveProperty("username");
    expect(JSON.stringify(normalized)).not.toContain("secret");
  });
});
