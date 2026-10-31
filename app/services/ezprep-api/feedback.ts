import { ezPrepApiClient } from "./browser-client";
import { ApiItemResponse, ApiListResponse } from "./envelope";

export const FEEDBACK_RATING_FIELDS = [
  { key: "userInterface", label: "User interface" },
  { key: "questions", label: "Questions" },
  { key: "fullMockTests", label: "Full mock tests" },
  { key: "topicWisePractice", label: "Topic-wise practice" },
  { key: "easeOfUse", label: "Ease of use" },
] as const;

export type FeedbackRatingKey = (typeof FEEDBACK_RATING_FIELDS)[number]["key"];

export type FeedbackRatings = Partial<Record<FeedbackRatingKey, number>>;

export interface FeedbackAuthor {
  id: string;
  name: string;
  email: string;
}

export interface FeedbackItem {
  id: string;
  text: string | null;
  ratings: FeedbackRatings;
  user: FeedbackAuthor | null;
  createdAt: string;
}

export interface FeedbackCategorySummary {
  average: number | null;
  count: number;
}

export interface FeedbackSummary {
  feedbackCount: number;
  overall: number | null;
  ratedCount: number;
  userInterface: FeedbackCategorySummary;
  questions: FeedbackCategorySummary;
  fullMockTests: FeedbackCategorySummary;
  topicWisePractice: FeedbackCategorySummary;
  easeOfUse: FeedbackCategorySummary;
}

export interface ListFeedbackParams {
  page?: number;
  limit?: number;
}

export const feedbackApi = {
  summary() {
    return ezPrepApiClient.get<ApiItemResponse<FeedbackSummary>>(
      "/v1/admin/feedback/summary"
    );
  },

  list(searchParams?: ListFeedbackParams) {
    const params: Record<string, string | number | undefined> = {};
    if (searchParams?.page != null) params.page = searchParams.page;
    if (searchParams?.limit != null) params.limit = searchParams.limit;

    return ezPrepApiClient.get<ApiListResponse<FeedbackItem>>(
      "/v1/admin/feedback",
      { searchParams: params }
    );
  },
};
