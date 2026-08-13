export type {
  ApiItemResponse,
  ApiListResponse,
  ApiMessageResponse,
  PaginationMeta,
} from "@/app/services/ezprep-api";

export type DraftStatus =
  | "GENERATING"
  | "REVIEW"
  | "PUBLISHING"
  | "PUBLISHED"
  | "DISCARDED";
export type ExamMode = "Mixed" | "Session-wise";
export type DifficultyLevel = "easy" | "medium" | "hard";

export interface FullMockExamListItem {
  id: string;
  examName: string;
  duration?: string;
  questions?: number;
  totalMarks?: number;
  category?: string;
  examGroup?: string;
  subjects: string[];
  mode: ExamMode;
}

export interface QuestionTextLocale {
  text?: string | null;
  imageUrl?: string | null;
}

export interface SafeQuestionOption {
  id: string;
  type: string;
  en?: string | null;
  ml?: string | null;
  imageUrl?: string | null;
}

export interface SafeQuestion {
  _id: string;
  questionText: {
    en: QuestionTextLocale;
    ml: QuestionTextLocale;
  };
  optionType?: string;
  options: SafeQuestionOption[];
  subject?: string;
  topic?: string;
  difficultyLevel?: DifficultyLevel | string;
}

export interface DraftQuestionItem extends SafeQuestion {
  position: number;
  marksPerQuestion: number;
  negativeMarking: number;
  replacedFrom?: string;
}

export interface DraftSubjectBlock {
  subjectId: string;
  name: string;
  numberOfQuestions: number;
  marksPerQuestion: number;
  hasNegativeMarking: boolean;
  negativeMarksPerQuestion: number;
  sessionTime?: number;
  questions: DraftQuestionItem[];
}

export interface DraftExamSnapshot {
  name: string;
  description?: string;
  duration?: number;
  totalQuestions: number;
  totalMarks?: number;
  isSessionWise: boolean;
}

export interface DraftResponse {
  id: string;
  examId: string;
  status: DraftStatus;
  examSnapshot: DraftExamSnapshot;
  subjects: DraftSubjectBlock[];
  publishedMockTestId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchQuestionItem extends SafeQuestion {
  snippet?: string;
}

export interface PublishDraftPayload {
  title?: string;
  description?: string;
  allowRetake?: boolean;
  shuffleOptions?: boolean;
  showResultsImmediately?: boolean;
  passingScore?: number;
}

export interface PublishDraftResult {
  mockTestId: string;
  draft: DraftResponse;
}

export interface FullMockSubjectConfig {
  subject: string;
  name: string;
  numberOfQuestions: number;
  marksPerQuestion: number;
  hasNegativeMarking: boolean;
  negativeMarksPerQuestion: number;
  sessionTime?: number;
  questionStartIndex: number;
  questionEndIndex: number;
}

export interface ExamSummary {
  id: string;
  name: string;
  description?: string;
}

export interface FullMockTestListItem {
  id: string;
  title?: string;
  description?: string;
  totalQuestions: number;
  durationInMinutes: number;
  totalMarks?: number;
  isSessionWise: boolean;
  exam: ExamSummary | null;
  subjectConfig: FullMockSubjectConfig[];
  marksPerQuestion: number;
  negativeMarking: number;
  passingScore?: number;
  allowRetake: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
