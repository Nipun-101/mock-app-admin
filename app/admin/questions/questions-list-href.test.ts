import { describe, expect, it } from "vitest";
import { questionsEditHref, questionsListHref } from "./questions-list-href";

describe("questions list href", () => {
  it("returns the bare list path when there is no query", () => {
    expect(questionsListHref()).toBe("/admin/questions");
    expect(questionsListHref(new URLSearchParams())).toBe("/admin/questions");
    expect(questionsEditHref("q1")).toBe("/admin/questions/q1");
  });

  it("keeps list pagination and filters when returning from edit", () => {
    const params = new URLSearchParams(
      "page=30&limit=20&subjectId=s1&examId=e1&topicId=t1&unused=x"
    );

    expect(questionsListHref(params)).toBe(
      "/admin/questions?page=30&limit=20&subjectId=s1&examId=e1&topicId=t1"
    );
    expect(questionsEditHref("q1", params)).toBe(
      "/admin/questions/q1?page=30&limit=20&subjectId=s1&examId=e1&topicId=t1"
    );
  });
});
