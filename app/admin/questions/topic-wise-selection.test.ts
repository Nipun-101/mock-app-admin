import { describe, expect, it } from "vitest";
import type { SelectedSprintQuestion } from "./sprint-selection";
import {
  canCreateTopicWiseTest,
  topicWiseSelectionIssue,
} from "./topic-wise-selection";

function question(
  id: string,
  subjectId = "sub-1",
  topicId = "top-1"
): SelectedSprintQuestion {
  return {
    id,
    snippet: id,
    subjectId,
    topicId,
    examIds: ["e1"],
    isActive: true,
  };
}

describe("topic-wise selection", () => {
  it("requires an allowed size, one subject, and one topic", () => {
    const ten = Array.from({ length: 10 }, (_, index) => question(`q-${index}`));
    expect(canCreateTopicWiseTest(ten)).toBe(true);
    expect(topicWiseSelectionIssue(ten.slice(0, 3))).toContain("at least 10");
    expect(topicWiseSelectionIssue(ten.slice(0, 9).concat(question("extra", "sub-2")))).toContain(
      "same subject"
    );

    const mixedTopic = ten.map((item, index) =>
      index === 0 ? question(item.id, "sub-1", "top-2") : item
    );
    expect(topicWiseSelectionIssue(mixedTopic)).toContain("same topic");

    const missingTopic = ten.map((item, index) =>
      index === 0 ? { ...item, topicId: undefined } : item
    );
    expect(topicWiseSelectionIssue(missingTopic)).toContain("same topic");
  });
});
