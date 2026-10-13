import { catalogApi } from "@/app/services/ezprep-api";

type QuestionTopicSource = {
  subjectId: string;
  questions: Array<{ topic?: string; subject?: string }>;
};

/**
 * Topic labels on a full-mock paper come from the live question, which can
 * belong to a different subject than the section it sits in (cross-subject
 * replacement). Section subjects alone do not include those topic names.
 */
export async function loadTopicNamesForQuestions(
  blocks: QuestionTopicSource[]
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const subjectIds = new Set<string>();

  for (const block of blocks) {
    if (block.subjectId) subjectIds.add(block.subjectId);
    for (const question of block.questions) {
      if (question.subject) subjectIds.add(question.subject);
    }
  }

  await Promise.all(
    [...subjectIds].map(async (subjectId) => {
      try {
        const { data } = await catalogApi.getSubject(subjectId);
        for (const topic of data.topics || []) {
          if (topic.id && topic.name) names.set(topic.id, topic.name);
        }
      } catch {
        // Topic labels are display-only.
      }
    })
  );

  const missingTopicIds = new Set<string>();
  for (const block of blocks) {
    for (const question of block.questions) {
      if (question.topic && !names.has(question.topic)) {
        missingTopicIds.add(question.topic);
      }
    }
  }

  await Promise.all(
    [...missingTopicIds].map(async (topicId) => {
      try {
        const { data } = await catalogApi.getTopic(topicId);
        if (data?.id && data.name) names.set(data.id, data.name);
      } catch {
        // Leave the id unresolved so the table can fall back to it.
      }
    })
  );

  return names;
}
