import { ezPrepApiClient } from "./browser-client";
import {
  ApiItemResponse,
  ApiListResponse,
  ApiMessageResponse,
  omitEmpty,
  omitUndefined,
} from "./envelope";
import { NamedRef } from "./catalog";

export interface QuestionImage {
  key: string;
  bucket: string;
  region?: string;
  contentType?: string;
  size?: number;
  lastModified?: string | Date;
  url?: string;
}

export interface QuestionTextLocale {
  text?: string | null;
  image?: QuestionImage | null;
}

export interface QuestionOption {
  id: string;
  type: string;
  en?: string | null;
  ml?: string | null;
  image?: QuestionImage | null;
}

export interface QuestionExplanation {
  en?: string | null;
  ml?: string | null;
  image?: QuestionImage | null;
  images?: QuestionImage[];
}

export interface Question {
  id: string;
  questionText: {
    en?: QuestionTextLocale;
    ml?: QuestionTextLocale;
  };
  optionType?: string;
  options: QuestionOption[];
  explanation?: QuestionExplanation;
  correctAnswer: string;
  subject?: NamedRef | string | null;
  topic?: NamedRef | string | null;
  exams?: Array<NamedRef | string>;
  tag?: string | null;
  difficultyLevel?: string;
  source?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type QuestionPayload = {
  questionText: Question["questionText"];
  optionType?: string;
  options: QuestionOption[];
  explanation?: QuestionExplanation;
  correctAnswer: string;
  subject?: string | null;
  topic?: string | null;
  exams?: string[];
  tag?: string | null;
  difficultyLevel?: string;
};

export const questionsApi = {
  list(searchParams?: {
    page?: number;
    limit?: number;
    subjectId?: string;
    topicId?: string;
    examId?: string;
  }) {
    return ezPrepApiClient.get<ApiListResponse<Question>>("/v1/questions", {
      searchParams,
    });
  },

  get(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<Question>>(`/v1/questions/${id}`);
  },

  create(body: QuestionPayload) {
    return ezPrepApiClient.post<ApiItemResponse<Question>>(
      "/v1/questions",
      omitEmpty(body as Record<string, unknown>)
    );
  },

  update(id: string, body: QuestionPayload) {
    return ezPrepApiClient.patch<ApiItemResponse<Question>>(
      `/v1/questions/${id}`,
      omitUndefined(body as Record<string, unknown>)
    );
  },

  delete(id: string) {
    return ezPrepApiClient.delete<ApiMessageResponse>(`/v1/questions/${id}`);
  },
};
