import { ezPrepApiClient } from "./browser-client";
import {
  ApiItemResponse,
  ApiListResponse,
  ApiMessageResponse,
  omitEmpty,
  omitUndefined,
} from "./envelope";
import { NamedRef } from "./catalog";

export interface DifficultyDistribution {
  easy: number;
  medium: number;
  hard: number;
}

export interface MockTestQuestion {
  id: string;
  questionText?: {
    en?: { text?: string | null };
    ml?: { text?: string | null };
  };
  subject?: NamedRef | null;
}

export interface MockTest {
  id: string;
  title?: string;
  description?: string;
  totalQuestions: number;
  durationInMinutes: number;
  exam?: NamedRef | string | null;
  subject?: NamedRef | string | null;
  topic?: NamedRef | string | null;
  generationMode?: string;
  marksPerQuestion: number;
  negativeMarking: number;
  passingScore?: number;
  allowRetake: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  isActive: boolean;
  difficultyDistribution?: DifficultyDistribution;
  questions?: MockTestQuestion[];
  questionIds?: MockTestQuestion[];
  createdAt?: string;
  updatedAt?: string;
}

export type CreateMockTestPayload = {
  totalQuestions: number;
  durationInMinutes: number;
  exam: string;
  subject: string;
  topic?: string;
  difficultyDistribution: DifficultyDistribution;
  title?: string;
  description?: string;
  generationMode?: string;
  marksPerQuestion?: number;
  negativeMarking?: number;
  passingScore?: number;
  allowRetake?: boolean;
  shuffleOptions?: boolean;
  showResultsImmediately?: boolean;
};

export const mockTestsApi = {
  list(searchParams?: { page?: number; limit?: number; search?: string }) {
    return ezPrepApiClient.get<ApiListResponse<MockTest>>("/v1/mock-tests", {
      searchParams,
    });
  },

  get(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<MockTest>>(`/v1/mock-tests/${id}`);
  },

  create(body: CreateMockTestPayload) {
    return ezPrepApiClient.post<ApiItemResponse<MockTest>>(
      "/v1/mock-tests",
      omitEmpty(body as Record<string, unknown>)
    );
  },

  update(id: string, body: CreateMockTestPayload) {
    return ezPrepApiClient.patch<ApiItemResponse<MockTest>>(
      `/v1/mock-tests/${id}`,
      omitUndefined(body as Record<string, unknown>)
    );
  },

  delete(id: string) {
    return ezPrepApiClient.delete<ApiMessageResponse>(`/v1/mock-tests/${id}`);
  },
};
