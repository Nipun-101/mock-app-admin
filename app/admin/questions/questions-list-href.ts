export const QUESTIONS_LIST_QUERY_KEYS = [
  "page",
  "limit",
  "subjectId",
  "examId",
  "topicId",
] as const;

export function questionsListHref(
  params?: { get(name: string): string | null } | null
): string {
  const next = new URLSearchParams();
  if (params) {
    for (const key of QUESTIONS_LIST_QUERY_KEYS) {
      const value = params.get(key);
      if (value) {
        next.set(key, value);
      }
    }
  }
  const query = next.toString();
  return query ? `/admin/questions?${query}` : "/admin/questions";
}

export function questionsEditHref(
  questionId: string,
  params?: { get(name: string): string | null } | null
): string {
  const listHref = questionsListHref(params);
  const queryIndex = listHref.indexOf("?");
  const query = queryIndex >= 0 ? listHref.slice(queryIndex) : "";
  return `/admin/questions/${questionId}${query}`;
}
