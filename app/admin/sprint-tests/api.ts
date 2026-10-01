import { ezPrepApiClient } from "@/app/services/ezprep-api";
import type {
  ApiItemResponse,
  ApiListResponse,
  ApiMessageResponse,
} from "@/app/services/ezprep-api";
import type {
  CreateSprintDraftPayload,
  PublishSprintDraftPayload,
  SprintDraft,
  SprintDraftListItem,
  SprintSearchQuestion,
  SprintTest,
} from "./types";

export { formatEzPrepError } from "@/app/services/ezprep-api";

const BASE = "/v1/sprint-tests";

export const sprintTestsApi = {
  createDraft(body: CreateSprintDraftPayload) {
    return ezPrepApiClient.post<ApiItemResponse<SprintDraft>>(`${BASE}/drafts`, body);
  },

  listDrafts(searchParams: { examId?: string; page?: number; limit?: number }) {
    return ezPrepApiClient.get<ApiListResponse<SprintDraftListItem>>(`${BASE}/drafts`, {
      searchParams,
    });
  },

  getDraft(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<SprintDraft>>(`${BASE}/drafts/${id}`);
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
    return ezPrepApiClient.get<ApiListResponse<SprintSearchQuestion>>(
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
    return ezPrepApiClient.patch<ApiItemResponse<SprintDraft>>(
      `${BASE}/drafts/${draftId}/questions/${position}`,
      {
        questionId,
        ...(options?.allowCrossSubject ? { allowCrossSubject: true } : {}),
      }
    );
  },

  publishDraft(draftId: string, payload: PublishSprintDraftPayload) {
    return ezPrepApiClient.post<
      ApiItemResponse<{ mockTestId: string; draft: SprintDraft }>
    >(`${BASE}/drafts/${draftId}/publish`, payload);
  },

  discardDraft(draftId: string) {
    return ezPrepApiClient.delete<ApiMessageResponse>(`${BASE}/drafts/${draftId}`);
  },

  listPublished(searchParams: { examId?: string; page?: number; limit?: number }) {
    return ezPrepApiClient.get<ApiListResponse<SprintTest>>(BASE, { searchParams });
  },

  getPublished(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<SprintTest>>(`${BASE}/${id}`);
  },

  deletePublished(id: string) {
    return ezPrepApiClient.delete<ApiMessageResponse>(`${BASE}/${id}`);
  },
};
