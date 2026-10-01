import { describe, expect, it } from "vitest";
import type { Question } from "@/app/services/ezprep-api";
import {
  isSprintSelectionSize,
  setQuestionSelected,
  setQuestionsSelected,
  sharedExamIds,
  snapshotQuestion,
  sprintSelectionHint,
} from "./sprint-selection";

function question(id: string, examIds: string[]): Question {
  return {
    id,
    questionText: { en: { text: `Stem ${id}` } },
    options: [],
    correctAnswer: "a",
    isActive: true,
    exams: examIds.map((examId) => ({ id: examId, name: examId })),
    subject: { id: "sub-1", name: "Polity" },
  };
}

describe("sprint selection", () => {
  it("enables a sprint only at the allowed sizes", () => {
    expect(isSprintSelectionSize(0)).toBe(false);
    expect(isSprintSelectionSize(9)).toBe(false);
    expect(isSprintSelectionSize(11)).toBe(false);
    expect([10, 15, 20, 25, 30].every(isSprintSelectionSize)).toBe(true);
    expect(sprintSelectionHint(3)).toContain("at least 10");
    expect(sprintSelectionHint(12)).toContain("exactly 10, 15, 20, 25, or 30");
    expect(sprintSelectionHint(12)).toContain("selected 12");
    expect(sprintSelectionHint(10)).toContain("create a sprint test");
  });

  it("keeps questions selected on other pages", () => {
    const firstPage = setQuestionSelected(
      new Map(),
      snapshotQuestion(question("q-1", ["e1"])),
      true
    );
    const bothPages = setQuestionsSelected(
      firstPage,
      [snapshotQuestion(question("q-2", ["e1"]))],
      true
    );

    expect([...bothPages.keys()]).toEqual(["q-1", "q-2"]);
    expect(setQuestionSelected(bothPages, snapshotQuestion(question("q-2", ["e1"])), false).has("q-1")).toBe(true);
  });

  it("keeps only exams tagged on every selected question", () => {
    const questions = [
      snapshotQuestion(question("q-1", ["e1", "e2"])),
      snapshotQuestion(question("q-2", ["e2", "e3"])),
    ];
    expect(sharedExamIds(questions)).toEqual(["e2"]);
    expect(
      sharedExamIds([
        ...questions,
        snapshotQuestion(question("q-3", ["e9"])),
      ])
    ).toEqual([]);
  });
});
