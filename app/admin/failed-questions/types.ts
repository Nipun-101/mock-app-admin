export interface ImportQuestionTextLocale {
  text: string | null;
  image: unknown | null;
}

export interface ImportQuestionOption {
  id: string;
  type: string;
  en?: string | null;
  ml?: string | null;
  image?: unknown | null;
}

export interface ImportQuestion {
  questionText: {
    en: ImportQuestionTextLocale;
    ml: ImportQuestionTextLocale;
  };
  optionType: string;
  options: ImportQuestionOption[];
  explanation: {
    en: string | null;
    ml: string | null;
    image: unknown | null;
  };
  correctAnswer: string;
  subject: string;
  topic: string;
  exams: string[];
  difficultyLevel: string;
  isActive?: boolean;
  isDeleted?: boolean;
  source?: string;
  tag?: string | null;
}

export interface MatchedQuestion {
  number: number;
  question: string;
  solution?: string;
}

export interface FailedQuestion {
  id: string;
  uploadId: string;
  questionNumber: number;
  failureStage: string;
  failureMessage: string;
  matchedQuestion?: MatchedQuestion;
  questionDraft: ImportQuestion;
  question?: ImportQuestion;
  createdAt: string;
  updatedAt: string;
}

export interface FailedQuestionPagination {
  page: number | null;
  limit: number | null;
  total: number;
  totalPages: number;
}

export interface FailedQuestionListData {
  items: FailedQuestion[];
  pagination: FailedQuestionPagination;
}

export interface FailedQuestionListResponse {
  message: string;
  data: FailedQuestionListData;
}

export interface FailedQuestionDetailResponse {
  message: string;
  data: FailedQuestion;
}

export interface ImportFailedQuestionResponse {
  message: string;
  data?: unknown;
}

export interface LookupItem {
  _id: string;
  name: string;
  topics?: LookupItem[];
}
