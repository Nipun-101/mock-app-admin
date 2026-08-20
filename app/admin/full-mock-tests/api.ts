import { ezPrepApiClient } from "@/app/services/ezprep-api";
import type {
  ApiItemResponse,
  ApiListResponse,
  ApiMessageResponse,
} from "@/app/services/ezprep-api";
import type {
  DraftResponse,
  DraftListItem,
  FullMockExamListItem,
  FullMockTestListItem,
  PublishDraftPayload,
  PublishDraftResult,
  SearchQuestionItem,
} from "./types";

export { formatEzPrepError } from "@/app/services/ezprep-api";

const BASE = "/v1/full-mock-tests";

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

  listDrafts(searchParams: {
    examId?: string;
    page?: number;
    limit?: number;
  }) {
    return ezPrepApiClient.get<ApiListResponse<DraftListItem>>(
      `${BASE}/drafts`,
      { searchParams }
    );
  },

  getDraft(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<DraftResponse>>(
      `${BASE}/drafts/${id}`
    );
  },

  searchQuestions(searchParams: {
    subjectId?: string;
    draftId?: string;
    search?: string;
    topicId?: string;
    difficultyLevel?: string;
    page?: number;
    limit?: number;
    allowCrossSubject?: boolean;
  }) {
    return ezPrepApiClient.get<ApiListResponse<SearchQuestionItem>>(
      `${BASE}/questions`,
      { searchParams }
    );
  },

  replaceQuestion(
    draftId: string,
    position: number,
    questionId: string,
    options?: { allowCrossSubject?: boolean }
  ) {
    return ezPrepApiClient.patch<ApiItemResponse<DraftResponse>>(
      `${BASE}/drafts/${draftId}/questions/${position}`,
      {
        questionId,
        ...(options?.allowCrossSubject ? { allowCrossSubject: true } : {}),
      }
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
