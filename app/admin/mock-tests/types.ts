export interface TopicWiseDifficultyDistribution {
  easy: number;
  medium: number;
  hard: number;
}

export interface TopicWiseDraftSettings {
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
  accessMode?: "FREE" | "ENTITLED";
  generationMode?: string;
  difficultyDistribution: TopicWiseDifficultyDistribution;
}

export interface TopicWiseQuestionItem {
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

export interface TopicWiseDraftSubjectBlock {
  subjectId: string;
  name: string;
  questions: TopicWiseQuestionItem[];
}

export interface TopicWiseDraft {
  id: string;
  examId: string;
  examName: string;
  subjectId: string;
  subjectName: string;
  topicId?: string;
  topicName?: string;
  status: string;
  settings: TopicWiseDraftSettings;
  subjects: TopicWiseDraftSubjectBlock[];
  publishedMockTestId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopicWiseDraftListItem {
  id: string;
  examId: string;
  examName: string;
  subjectId: string;
  subjectName: string;
  topicId?: string;
  topicName?: string;
  status: string;
  totalQuestions: number;
  durationInMinutes: number;
  title?: string;
  difficultyDistribution?: TopicWiseDifficultyDistribution;
  createdAt: string;
  updatedAt: string;
}

export interface TopicWiseSearchQuestion {
  _id: string;
  questionText?: TopicWiseQuestionItem["questionText"];
  options: TopicWiseQuestionItem["options"];
  subject?: string;
  topic?: string;
  difficultyLevel?: string;
  snippet?: string;
}

export interface CreateTopicWiseDraftPayload {
  exam: string;
  totalQuestions: number;
  durationInMinutes: number;
  subject?: string;
  topic?: string;
  difficultyDistribution?: TopicWiseDifficultyDistribution;
  questionIds?: string[];
  title?: string;
  description?: string;
  generationMode?: string;
  marksPerQuestion?: number;
  negativeMarking?: number;
  passingScore?: number;
  allowRetake?: boolean;
  shuffleOptions?: boolean;
  showResultsImmediately?: boolean;
  accessMode?: "FREE" | "ENTITLED";
}

export interface PublishTopicWiseDraftPayload {
  title?: string;
  description?: string;
  marksPerQuestion?: number;
  negativeMarking?: number;
  passingScore?: number;
  allowRetake?: boolean;
  shuffleOptions?: boolean;
  showResultsImmediately?: boolean;
  accessMode?: "FREE" | "ENTITLED";
}
