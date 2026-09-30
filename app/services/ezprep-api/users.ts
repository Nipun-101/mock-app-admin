import { ezPrepApiClient } from "./browser-client";
import { ApiItemResponse, ApiListResponse } from "./envelope";

export const APP_USER_ROLE = "user" as const;
export const ADMIN_ROLE = "admin" as const;

export type AppUserRole = typeof APP_USER_ROLE;

export interface AppUserLocation {
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
}

export interface AppUserSubscription {
  plan: "free" | "basic" | "premium" | "enterprise";
  status: "trial" | "active" | "past_due" | "cancelled" | "expired";
}

export interface AppUserTargetExam {
  id: string;
  name: string;
}

export interface AttemptStatusCounts {
  /** SUBMITTED or EXPIRED attempts. */
  finished: number;
  /** Started, in progress, or paused attempts. */
  open: number;
}

export interface AppUserTestActivity {
  fullExam: AttemptStatusCounts;
  topicWise: AttemptStatusCounts;
}

/**
 * Learner directory row. `role` is always `"user"` — admins are excluded
 * by the API and again in the UI before render.
 * `email` and `phoneNumber` are masked by the API (`a***@gmail.com`,
 * `+91**********`). The UI also remasks before render.
 */
export interface AppUser {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role: AppUserRole;
  isActive: boolean;
  gender?: string;
  location?: AppUserLocation;
  subscription?: AppUserSubscription;
  membershipTier?: "none" | "bronze" | "silver" | "gold" | "platinum";
  badgesEarnedCount?: number;
  targetExam?: AppUserTargetExam;
  /** Sum of every bucket in `testActivity`. */
  testsAttendedCount: number;
  testActivity?: AppUserTestActivity;
  createdAt: string;
  updatedAt: string;
}

export interface ListAppUsersParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface AppUserSubscriptionDetail extends AppUserSubscription {
  startedAt?: string;
  expiresAt?: string;
  trialEndsAt?: string;
  autoRenew?: boolean;
}

export interface AppUserStudyPreference {
  studyTime?: "morning" | "afternoon" | "evening" | "night";
  weeklyStudyGoalHours?: number;
}

/** Learner profile for the admin detail page. Contact fields stay masked. */
export interface AppUserDetailProfile extends AppUser {
  bio?: string;
  dateOfBirth?: string;
  targetExamDate?: string;
  lastTierUpdatedAt?: string;
  subscription?: AppUserSubscriptionDetail;
  study?: AppUserStudyPreference;
}

export type PerformanceTrend =
  | "improving"
  | "declining"
  | "steady"
  | "insufficient";

export interface FinishedAttempt {
  id: string;
  mockTestId: string;
  title: string;
  paperType: "TOPIC_WISE" | "FULL_EXAM";
  status: "SUBMITTED" | "EXPIRED";
  score: number;
  totalMarks: number;
  percentage: number | null;
  correct: number;
  incorrect: number;
  unanswered: number;
  totalQuestions: number;
  passingScore: number | null;
  passed: boolean | null;
  examName: string | null;
  subjectName: string | null;
  topicName: string | null;
  timeConsumedSeconds: number;
  durationInMinutes: number;
  startedAt?: string;
  submittedAt?: string;
}

export interface PaperPerformance {
  finishedCount: number;
  score: number;
  totalMarks: number;
  percentage: number | null;
  averagePercentage: number | null;
  bestPercentage: number | null;
  latestPercentage: number | null;
  accuracy: number | null;
  correct: number;
  incorrect: number;
  unanswered: number;
  passedCount: number;
  gradedCount: number;
  trend: PerformanceTrend;
}

export interface UserPerformanceAnalysis {
  topicWise: PaperPerformance;
  fullExam: PaperPerformance;
  overall: PaperPerformance;
}

export interface AppUserDetail {
  profile: AppUserDetailProfile;
  recentTopicWiseAttempts: FinishedAttempt[];
  recentFullExamAttempts: FinishedAttempt[];
  analysis: UserPerformanceAnalysis;
}

export const usersApi = {
  list(searchParams?: ListAppUsersParams) {
    const params: Record<string, string | number | undefined> = {};
    if (searchParams?.page != null) params.page = searchParams.page;
    if (searchParams?.limit != null) params.limit = searchParams.limit;
    if (searchParams?.search?.trim()) params.search = searchParams.search.trim();

    return ezPrepApiClient.get<ApiListResponse<AppUser>>("/v1/admin/users", {
      searchParams: params,
    });
  },

  get(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<AppUserDetail>>(
      `/v1/admin/users/${encodeURIComponent(id)}`
    );
  },
};
