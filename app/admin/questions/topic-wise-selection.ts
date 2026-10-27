import { isSprintSelectionSize, type SelectedSprintQuestion } from "./sprint-selection";

const SIZES = "10, 15, 20, 25, or 30";

export function topicWiseSelectionIssue(
  questions: SelectedSprintQuestion[]
): string | null {
  const count = questions.length;
  if (!isSprintSelectionSize(count)) {
    if (count < 10) {
      return `Select at least 10 questions. A topic-wise test must have exactly ${SIZES} questions.`;
    }
    return `A topic-wise test must have exactly ${SIZES} questions. You have selected ${count}. Add or remove questions to reach one of those counts.`;
  }

  const subjects = new Set(
    questions.map((question) => question.subjectId).filter((id): id is string => Boolean(id))
  );
  if (subjects.size !== 1 || questions.some((question) => !question.subjectId)) {
    return "Every question on a topic-wise test must belong to the same subject.";
  }

  const topics = new Set(
    questions.map((question) => question.topicId).filter((id): id is string => Boolean(id))
  );
  if (topics.size !== 1 || questions.some((question) => !question.topicId)) {
    return "Every question on a topic-wise test must belong to the same topic.";
  }

  return null;
}

export function canCreateTopicWiseTest(
  questions: SelectedSprintQuestion[]
): boolean {
  return topicWiseSelectionIssue(questions) === null;
}
