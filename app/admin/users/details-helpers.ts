import {
  ADMIN_ROLE,
  type AppUserDetail,
  type AppUserDetailProfile,
  type FinishedAttempt,
  type PaperPerformance,
  type PerformanceTrend,
} from "@/app/services/ezprep-api/users";
import {
  maskEmail,
  maskPhoneNumber,
  normalizeTestActivity,
  safeCount,
} from "./helpers";

export const RECENT_ATTEMPT_LIMIT = 5;

const OPEN_ATTEMPT_STATUSES = new Set(["IN_PROGRESS", "PAUSED", "STARTED"]);

const EMPTY_PAPER: PaperPerformance = {
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
  trend: "insufficient",
};

function finiteNumber(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

function nonNegative(value: unknown): number {
  return Math.max(0, finiteNumber(value, 0));
}

function optionalPercent(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

export function formatMark(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Math.round(value * 100) / 100);
}

export function formatScoreLine(score: number, totalMarks: number): string {
  const scoreText = formatMark(score);
  if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
    return scoreText;
  }
  return `${scoreText} / ${formatMark(totalMarks)}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1,
  }).format(value);
  return `${formatted}%`;
}

export function formatDuration(seconds?: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) {
    return null;
  }
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
  }
  return `${remaining}s`;
}

export function formatDateTime(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

const STUDY_TIME_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  trial: "Trial",
  active: "Active",
  past_due: "Past due",
  cancelled: "Cancelled",
  expired: "Expired",
};

export function genderLabel(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  return GENDER_LABELS[value] ?? null;
}

export function studyTimeLabel(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  return STUDY_TIME_LABELS[value] ?? null;
}

export function subscriptionStatusLabel(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  return SUBSCRIPTION_STATUS_LABELS[value] ?? null;
}

export function attemptStatusLabel(status?: string | null): string {
  if (status === "EXPIRED") {
    return "Time expired";
  }
  if (status === "SUBMITTED") {
    return "Submitted";
  }
  return "Finished";
}

export function trendLabel(trend: PerformanceTrend): string {
  switch (trend) {
    case "improving":
      return "Improving";
    case "declining":
      return "Slipping";
    case "steady":
      return "Steady";
    default:
      return "Not enough tests";
  }
}

export function attemptContext(attempt: FinishedAttempt): string | null {
  const parts = [attempt.examName, attempt.subjectName, attempt.topicName].filter(
    (part): part is string => Boolean(part && part.trim())
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function recentAttemptsCaption(
  shown: number,
  finishedCount: number
): string | null {
  const visible = Math.max(0, Math.trunc(shown));
  const finished = Math.max(0, Math.trunc(finishedCount));
  if (visible === 0) {
    return null;
  }
  if (finished > visible) {
    return `Latest ${visible} of ${finished} finished`;
  }
  if (visible === 1) {
    return "1 finished test";
  }
  return `All ${visible} finished tests`;
}

export function performanceSummary(
  performance: PaperPerformance,
  noun: { singular: string; plural: string }
): string {
  if (performance.finishedCount <= 0) {
    return `No finished ${noun.plural} yet.`;
  }
  const countLabel =
    performance.finishedCount === 1
      ? `1 finished ${noun.singular}`
      : `${performance.finishedCount} finished ${noun.plural}`;
  const marks =
    performance.percentage == null
      ? formatScoreLine(performance.score, performance.totalMarks)
      : `${formatPercent(performance.percentage)} across ${formatScoreLine(performance.score, performance.totalMarks)}`;
  const trend = {
    improving: "Recent scores are improving.",
    declining: "Recent scores are slipping.",
    steady: "Recent scores are holding steady.",
    insufficient: "Not enough scored tests to judge recent form.",
  }[performance.trend];
  return `${countLabel}. ${marks}. ${trend}`;
}

function normalizePaper(value: Partial<PaperPerformance> | null | undefined): PaperPerformance {
  const trend = value?.trend;
  const knownTrend: PerformanceTrend =
    trend === "improving" ||
    trend === "declining" ||
    trend === "steady" ||
    trend === "insufficient"
      ? trend
      : "insufficient";
  const totalMarks = nonNegative(value?.totalMarks);
  return {
    finishedCount: safeCount(value?.finishedCount),
    score: finiteNumber(value?.score, 0),
    totalMarks,
    percentage: totalMarks > 0 ? optionalPercent(value?.percentage) : null,
    averagePercentage: optionalPercent(value?.averagePercentage),
    bestPercentage: optionalPercent(value?.bestPercentage),
    latestPercentage: optionalPercent(value?.latestPercentage),
    accuracy: optionalPercent(value?.accuracy),
    correct: safeCount(value?.correct),
    incorrect: safeCount(value?.incorrect),
    unanswered: safeCount(value?.unanswered),
    passedCount: safeCount(value?.passedCount),
    gradedCount: safeCount(value?.gradedCount),
    trend: knownTrend,
  };
}

function normalizeAttempt(
  raw: Partial<FinishedAttempt> | null | undefined,
  expectedPaperType?: FinishedAttempt["paperType"]
): FinishedAttempt | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const status = typeof raw.status === "string" ? raw.status : "";
  if (OPEN_ATTEMPT_STATUSES.has(status)) {
    return null;
  }
  if (status && status !== "SUBMITTED" && status !== "EXPIRED") {
    return null;
  }
  const id = optionalText(raw.id);
  if (!id) {
    return null;
  }

  const paperType =
    raw.paperType === "FULL_EXAM" ||
    raw.paperType === "SPRINT" ||
    raw.paperType === "TOPIC_WISE"
      ? raw.paperType
      : null;
  if (!paperType || (expectedPaperType && paperType !== expectedPaperType)) {
    return null;
  }

  const score = finiteNumber(raw.score, 0);
  const totalMarks = nonNegative(raw.totalMarks);
  const passingScore =
    typeof raw.passingScore === "number" &&
    Number.isFinite(raw.passingScore) &&
    raw.passingScore > 0
      ? raw.passingScore
      : null;
  const passed =
    passingScore == null
      ? null
      : typeof raw.passed === "boolean"
        ? raw.passed
        : score >= passingScore;

  return {
    id,
    mockTestId: optionalText(raw.mockTestId) ?? "",
    title: optionalText(raw.title) ?? "Untitled test",
    paperType,
    status: status === "EXPIRED" ? "EXPIRED" : "SUBMITTED",
    score,
    totalMarks,
    percentage:
      totalMarks > 0
        ? (optionalPercent(raw.percentage) ??
          Math.round((score / totalMarks) * 1000) / 10)
        : null,
    correct: safeCount(raw.correct),
    incorrect: safeCount(raw.incorrect),
    unanswered: safeCount(raw.unanswered),
    totalQuestions: safeCount(raw.totalQuestions),
    passingScore,
    passed,
    examName: optionalText(raw.examName),
    subjectName: optionalText(raw.subjectName),
    topicName: optionalText(raw.topicName),
    timeConsumedSeconds: nonNegative(raw.timeConsumedSeconds),
    durationInMinutes: safeCount(raw.durationInMinutes),
    startedAt: optionalText(raw.startedAt) ?? undefined,
    submittedAt: optionalText(raw.submittedAt) ?? undefined,
  };
}

function normalizeAttempts(
  rows: Array<Partial<FinishedAttempt>> | null | undefined,
  paperType: FinishedAttempt["paperType"]
): FinishedAttempt[] {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows
    .map((row) => normalizeAttempt(row, paperType))
    .filter((row): row is FinishedAttempt => row !== null)
    .slice(0, RECENT_ATTEMPT_LIMIT);
}

function normalizeProfile(
  profile: Partial<Omit<AppUserDetailProfile, "role">> & { role?: string }
): AppUserDetailProfile | null {
  if (profile.role === ADMIN_ROLE) {
    return null;
  }
  if (profile.role && profile.role !== "user") {
    return null;
  }
  const id = optionalText(profile.id);
  if (!id) {
    return null;
  }
  const testActivity = normalizeTestActivity(profile.testActivity);
  const targetExam =
    profile.targetExam?.id && profile.targetExam.name
      ? { id: profile.targetExam.id, name: profile.targetExam.name }
      : undefined;
  return {
    id,
    name: optionalText(profile.name) ?? "",
    email: maskEmail(profile.email),
    phoneNumber: maskPhoneNumber(profile.phoneNumber),
    avatarUrl: optionalText(profile.avatarUrl) ?? undefined,
    role: "user",
    isActive: profile.isActive !== false,
    gender: optionalText(profile.gender) ?? undefined,
    location: profile.location,
    subscription: profile.subscription,
    membershipTier: profile.membershipTier,
    badgesEarnedCount: safeCount(profile.badgesEarnedCount),
    targetExam,
    testActivity,
    testsAttendedCount:
      testActivity.fullExam.finished +
      testActivity.fullExam.open +
      testActivity.topicWise.finished +
      testActivity.topicWise.open +
      testActivity.sprint.finished +
      testActivity.sprint.open,
    createdAt: optionalText(profile.createdAt) ?? "",
    updatedAt: optionalText(profile.updatedAt) ?? "",
    bio: optionalText(profile.bio) ?? undefined,
    dateOfBirth: optionalText(profile.dateOfBirth) ?? undefined,
    targetExamDate: optionalText(profile.targetExamDate) ?? undefined,
    lastTierUpdatedAt: optionalText(profile.lastTierUpdatedAt) ?? undefined,
    study: profile.study,
  };
}

/**
 * Makes the detail payload safe to render: masks contact fields, drops
 * non-learners, ignores open attempts, and never shows more than five
 * recent tests of each kind.
 */
export function normalizeUserDetail(
  input: Partial<AppUserDetail> | null | undefined
): AppUserDetail | null {
  if (!input?.profile) {
    return null;
  }
  const profile = normalizeProfile(input.profile);
  if (!profile) {
    return null;
  }
  const analysis = input.analysis;
  return {
    profile,
    recentTopicWiseAttempts: normalizeAttempts(
      input.recentTopicWiseAttempts,
      "TOPIC_WISE"
    ),
    recentFullExamAttempts: normalizeAttempts(
      input.recentFullExamAttempts,
      "FULL_EXAM"
    ),
    recentSprintAttempts: normalizeAttempts(
      input.recentSprintAttempts,
      "SPRINT"
    ),
    analysis: {
      topicWise: normalizePaper(analysis?.topicWise),
      fullExam: normalizePaper(analysis?.fullExam),
      sprint: normalizePaper(analysis?.sprint),
      overall: normalizePaper(analysis?.overall),
    },
  };
}
