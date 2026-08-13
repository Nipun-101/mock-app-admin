import { ezPrepApiClient } from "@/app/services/ezprep-api";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";
import type {
  ApiItemResponse,
  ApiListResponse,
  ApiMessageResponse,
  DraftResponse,
  FullMockExamListItem,
  FullMockTestListItem,
  PublishDraftPayload,
  PublishDraftResult,
  SearchQuestionItem,
} from "./types";

const BASE = "/v1/full-mock-tests";

export function formatEzPrepError(error: unknown, fallback: string): string {
  if (!(error instanceof EzPrepApiError)) {
    return fallback;
  }

  if (error.status === 401 || error.status === 403) {
    return "Session expired or you are not signed in. Please sign in again.";
  }

  const data =
    error.data && typeof error.data === "object"
      ? (error.data as Record<string, unknown>)
      : null;

  const rawMessage = data?.message;
  const message =
    typeof rawMessage === "string"
      ? rawMessage
      : Array.isArray(rawMessage)
        ? rawMessage.join(", ")
        : error.message;

  const code = data?.error ?? data?.code;
  const parts = [message];
  if (typeof code === "string") {
    parts.push(`(${code})`);
  }

  const details = data?.details;
  if (Array.isArray(details)) {
    const extra = details
      .map((item) => {
        if (!item || typeof item !== "object") return JSON.stringify(item);
        const row = item as Record<string, unknown>;
        if (Array.isArray(row.displayPositions)) {
          return `positions ${row.displayPositions.join(", ")}`;
        }
        if (typeof row.rule === "string") {
          if (row.expected != null) {
            return `${row.rule}: expected ${row.expected}, got ${row.actual}`;
          }
          return row.rule;
        }
        return JSON.stringify(item);
      })
      .join("; ");
    if (extra) parts.push(extra);
  } else if (details && typeof details === "object") {
    const row = details as Record<string, unknown>;
    if (row.subjectName) {
      parts.push(
        `${row.subjectName}: need ${row.needed}, available ${row.available}`
      );
    }
    if (typeof row.existingPosition === "number") {
      parts.push(`already used at position ${row.existingPosition + 1}`);
    }
    if (typeof row.expected === "number" && typeof row.actual === "number") {
      parts.push(`expected ${row.expected}, got ${row.actual}`);
    }
  }

  return parts.join(" — ");
}

export const fullMockApi = {
  listExams(searchParams: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    return ezPrepApiClient.get<ApiListResponse<FullMockExamListItem>>(
      `${BASE}/exams`,
      { searchParams }
    );
  },

  createDraft(examId: string) {
    return ezPrepApiClient.post<ApiItemResponse<DraftResponse>>(
      `${BASE}/drafts`,
      { examId }
    );
  },

  getDraft(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<DraftResponse>>(
      `${BASE}/drafts/${id}`
    );
  },

  searchQuestions(searchParams: {
    subjectId: string;
    draftId?: string;
    search?: string;
    topicId?: string;
    difficultyLevel?: string;
    page?: number;
    limit?: number;
  }) {
    return ezPrepApiClient.get<ApiListResponse<SearchQuestionItem>>(
      `${BASE}/questions`,
      { searchParams }
    );
  },

  replaceQuestion(draftId: string, position: number, questionId: string) {
    return ezPrepApiClient.patch<ApiItemResponse<DraftResponse>>(
      `${BASE}/drafts/${draftId}/questions/${position}`,
      { questionId }
    );
  },

  publishDraft(draftId: string, payload: PublishDraftPayload) {
    return ezPrepApiClient.post<ApiItemResponse<PublishDraftResult>>(
      `${BASE}/drafts/${draftId}/publish`,
      payload
    );
  },

  discardDraft(draftId: string) {
    return ezPrepApiClient.delete<ApiMessageResponse>(
      `${BASE}/drafts/${draftId}`
    );
  },

  listPublished(searchParams: {
    examId?: string;
    page?: number;
    limit?: number;
  }) {
    return ezPrepApiClient.get<ApiListResponse<FullMockTestListItem>>(BASE, {
      searchParams,
    });
  },

  getPublished(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<FullMockTestListItem>>(
      `${BASE}/${id}`
    );
  },
};
