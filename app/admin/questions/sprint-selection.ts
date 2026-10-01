import { refId, refName, type Question } from "@/app/services/ezprep-api";
import type { SafeQuestion } from "@/app/admin/full-mock-tests/types";

export const SPRINT_SELECTION_SIZES = [10, 15, 20, 25, 30] as const;

export interface SelectedSprintQuestion {
  id: string;
  snippet: string;
  subjectName?: string;
  examIds: string[];
  difficultyLevel?: string;
  isActive: boolean;
  preview?: SafeQuestion;
}

export function isSprintSelectionSize(count: number): boolean {
  return (SPRINT_SELECTION_SIZES as readonly number[]).includes(count);
}

export function sprintSelectionHint(count: number): string {
  const sizes = "10, 15, 20, 25, or 30";
  if (isSprintSelectionSize(count)) {
    return `${count} questions selected. You can create a sprint test.`;
  }
  if (count < 10) {
    return `Select at least 10 questions. A sprint must have exactly ${sizes} questions.`;
  }
  return `A sprint must have exactly ${sizes} questions. You have selected ${count}. Add or remove questions to reach one of those counts.`;
}

export function snapshotQuestion(question: Question): SelectedSprintQuestion {
  const text =
    question.questionText?.en?.text ||
    question.questionText?.ml?.text ||
    "Question";
  return {
    id: question.id,
    snippet: text.slice(0, 140),
    subjectName: refName(question.subject),
    examIds: (question.exams || [])
      .map((exam) => refId(exam))
      .filter((id): id is string => Boolean(id)),
    difficultyLevel: question.difficultyLevel,
    isActive: question.isActive,
    preview: {
      _id: question.id,
      questionText: {
        en: {
          text: question.questionText?.en?.text ?? null,
          imageUrl: question.questionText?.en?.image?.url ?? null,
        },
        ml: {
          text: question.questionText?.ml?.text ?? null,
          imageUrl: question.questionText?.ml?.image?.url ?? null,
        },
      },
      options: (question.options || []).map((option) => ({
        id: option.id,
        type: option.type,
        en: option.en,
        ml: option.ml,
        imageUrl: option.image?.url ?? null,
      })),
      difficultyLevel: question.difficultyLevel,
    },
  };
}

export function setQuestionSelected(
  current: ReadonlyMap<string, SelectedSprintQuestion>,
  question: SelectedSprintQuestion,
  selected: boolean
): Map<string, SelectedSprintQuestion> {
  const next = new Map(current);
  if (selected) {
    next.set(question.id, question);
  } else {
    next.delete(question.id);
  }
  return next;
}

export function setQuestionsSelected(
  current: ReadonlyMap<string, SelectedSprintQuestion>,
  questions: SelectedSprintQuestion[],
  selected: boolean
): Map<string, SelectedSprintQuestion> {
  return questions.reduce(
    (next, question) => setQuestionSelected(next, question, selected),
    new Map(current)
  );
}

export function sharedExamIds(questions: SelectedSprintQuestion[]): string[] {
  if (questions.length === 0) {
    return [];
  }
  return questions.slice(1).reduce((ids, question) => {
    const allowed = new Set(question.examIds);
    return ids.filter((id) => allowed.has(id));
  }, [...questions[0].examIds]);
}
