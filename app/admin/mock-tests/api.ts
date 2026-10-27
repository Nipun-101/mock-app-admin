import { ezPrepApiClient } from "@/app/services/ezprep-api";
import type {
  ApiItemResponse,
  ApiListResponse,
  ApiMessageResponse,
} from "@/app/services/ezprep-api";
import { omitEmpty } from "@/app/services/ezprep-api/envelope";
import type {
  CreateTopicWiseDraftPayload,
  PublishTopicWiseDraftPayload,
  TopicWiseDraft,
  TopicWiseDraftListItem,
  TopicWiseSearchQuestion,
} from "./types";

export { formatEzPrepError } from "@/app/services/ezprep-api";

const BASE = "/v1/mock-tests/drafts";

export const topicWiseDraftsApi = {
  createDraft(body: CreateTopicWiseDraftPayload) {
    return ezPrepApiClient.post<ApiItemResponse<TopicWiseDraft>>(
      BASE,
      omitEmpty(body as unknown as Record<string, unknown>)
    );
  },

  listDrafts(searchParams?: { examId?: string; page?: number; limit?: number }) {
    return ezPrepApiClient.get<ApiListResponse<TopicWiseDraftListItem>>(BASE, {
      searchParams,
    });
  },

  getDraft(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<TopicWiseDraft>>(`${BASE}/${id}`);
  },

  searchQuestions(searchParams: {
    draftId: string;
    search?: string;
    topicId?: string;
    difficultyLevel?: string;
    page?: number;
    limit?: number;
  }) {
    return ezPrepApiClient.get<ApiListResponse<TopicWiseSearchQuestion>>(
      `${BASE}/questions`,
      { searchParams }
    );
  },

  replaceQuestion(draftId: string, position: number, questionId: string) {
    return ezPrepApiClient.patch<ApiItemResponse<TopicWiseDraft>>(
      `${BASE}/${draftId}/questions/${position}`,
      { questionId }
    );
  },

  publishDraft(draftId: string, payload: PublishTopicWiseDraftPayload) {
    return ezPrepApiClient.post<
      ApiItemResponse<{ mockTestId: string; draft: TopicWiseDraft }>
    >(`${BASE}/${draftId}/publish`, payload);
  },

  discardDraft(draftId: string) {
    return ezPrepApiClient.delete<ApiMessageResponse>(`${BASE}/${draftId}`);
  },
};
