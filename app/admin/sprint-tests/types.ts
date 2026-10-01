export interface SprintDraftSettings {
  totalQuestions: number;
  durationInMinutes: number;
  title?: string;
  description?: string;
  marksPerQuestion: number;
  negativeMarking: number;
  passingScore?: number;
  allowRetake: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
}

export interface SprintQuestionItem {
  _id: string;
  questionText?: {
    en?: { text?: string | null; imageUrl?: string | null };
    ml?: { text?: string | null; imageUrl?: string | null };
  };
  optionType?: string;
  options: Array<{
    id: string;
    type: string;
    en?: string | null;
    ml?: string | null;
    imageUrl?: string | null;
  }>;
  subject?: string;
  topic?: string;
  difficultyLevel?: string;
  position: number;
  marksPerQuestion: number;
  negativeMarking: number;
  replacedFrom?: string;
}

export interface SprintDraftSubjectBlock {
  subjectId: string;
  name: string;
  questions: SprintQuestionItem[];
}

export interface SprintDraft {
  id: string;
  examId: string;
  examName: string;
  status: string;
  settings: SprintDraftSettings;
  subjects: SprintDraftSubjectBlock[];
  publishedMockTestId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SprintDraftListItem {
  id: string;
  examId: string;
  examName: string;
  status: string;
  totalQuestions: number;
  durationInMinutes: number;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SprintSearchQuestion {
  _id: string;
  questionText?: SprintQuestionItem["questionText"];
  options: SprintQuestionItem["options"];
  subject?: string;
  topic?: string;
  difficultyLevel?: string;
  snippet?: string;
}

export interface SprintExamRef {
  id: string;
  name: string;
  description?: string;
}

export interface SprintTest {
  id: string;
  title?: string;
  description?: string;
  totalQuestions: number;
  durationInMinutes: number;
  exam?: SprintExamRef | null;
  marksPerQuestion: number;
  negativeMarking: number;
  passingScore?: number;
  allowRetake: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  questions?: SprintQuestionItem[];
}

export interface CreateSprintDraftPayload {
  examId: string;
  totalQuestions: number;
  durationInMinutes: number;
  title?: string;
  description?: string;
  marksPerQuestion?: number;
  negativeMarking?: number;
  passingScore?: number;
  allowRetake?: boolean;
  shuffleOptions?: boolean;
  showResultsImmediately?: boolean;
  questionIds?: string[];
}

export interface PublishSprintDraftPayload {
  title?: string;
  description?: string;
  marksPerQuestion?: number;
  negativeMarking?: number;
  passingScore?: number;
  allowRetake?: boolean;
  shuffleOptions?: boolean;
  showResultsImmediately?: boolean;
}

export const SPRINT_SIZE_OPTIONS = [10, 15, 20, 25, 30] as const;
