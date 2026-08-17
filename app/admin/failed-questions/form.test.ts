import { describe, expect, it } from "vitest";
import {
  isFixFormValid,
  normalizeFailedQuestionForm,
  OPTION_COUNT,
  OPTION_LABELS,
  toImageMetadata,
  type FixFormValues,
} from "./form";

const OBJECT_ID = "507f1f77bcf86cd799439011";
const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("toImageMetadata", () => {
  it("requires key and bucket and fills a default region", () => {
    expect(toImageMetadata(null)).toBeNull();
    expect(toImageMetadata([])).toBeNull();
    expect(toImageMetadata({ key: " ", bucket: "b" })).toBeNull();
    expect(toImageMetadata({ key: "k", bucket: " " })).toBeNull();
    expect(toImageMetadata({ key: "k", bucket: "b" })).toEqual({
      key: "k",
      bucket: "b",
      region: "ap-south-1",
    });
    expect(
      toImageMetadata({
        key: " k ",
        bucket: " b ",
        region: " us-east-1 ",
        contentType: "image/png",
        size: 12,
        lastModified: "now",
      })
    ).toEqual({
      key: "k",
      bucket: "b",
      region: "us-east-1",
      contentType: "image/png",
      size: 12,
      lastModified: "now",
    });
  });
});

describe("normalizeFailedQuestionForm", () => {
  it("builds four option slots and ignores invalid ids", () => {
    const { options, values } = normalizeFailedQuestionForm({
      optionType: "image",
      options: [{ id: "not-uuid", type: "image", en: "A" }],
      questionText: {
        en: { text: "Hello", image: { key: "k", bucket: "b" } },
        ml: { text: null, image: null },
      },
      correctAnswer: "missing",
      subject: "nope",
      topic: OBJECT_ID,
      exams: [OBJECT_ID, "bad"],
      tag: OBJECT_ID,
      difficultyLevel: "insane",
      explanation: { en: "e", ml: "m", image: null },
    });

    expect(options).toHaveLength(OPTION_COUNT);
    expect(options.map((option) => option.label)).toEqual([...OPTION_LABELS]);
    expect(values.optionType).toBe("image");
    expect(values.questionText.en.text).toBe("Hello");
    expect(values.correctAnswer).toBeUndefined();
    expect(values.subject).toBeUndefined();
    expect(values.topic).toBe(OBJECT_ID);
    expect(values.exams).toEqual([OBJECT_ID]);
    expect(values.tag).toBe(OBJECT_ID);
    expect(values.difficultyLevel).toBeUndefined();
  });

  it("keeps a matching UUID correct answer and defaults a missing draft", () => {
    const { options, values } = normalizeFailedQuestionForm({
      optionType: "text",
      options: [{ id: UUID, type: "text", en: "A" }],
      correctAnswer: UUID,
      questionText: { en: { text: "Q", image: null }, ml: { text: "", image: null } },
      explanation: { en: "", ml: "", image: null },
      subject: OBJECT_ID,
      topic: OBJECT_ID,
      exams: [],
      difficultyLevel: "medium",
    });
    expect(values.correctAnswer).toBe(options[0].id);
    expect(normalizeFailedQuestionForm().values.optionType).toBe("text");
    expect(normalizeFailedQuestionForm(null).options).toHaveLength(4);
  });
});

describe("isFixFormValid", () => {
  it("accepts a complete text question", () => {
    const { options, values } = normalizeFailedQuestionForm({
      optionType: "text",
      options: OPTION_LABELS.map((label, index) => ({
        id: `550e8400-e29b-41d4-a716-44665544000${index}`,
        type: "text",
        en: `Option ${label}`,
      })),
      questionText: { en: { text: "Q?", image: null }, ml: { text: "", image: null } },
      correctAnswer: "550e8400-e29b-41d4-a716-446655440000",
      explanation: { en: "Because", ml: "", image: null },
      subject: OBJECT_ID,
      topic: OBJECT_ID,
      exams: [OBJECT_ID],
      difficultyLevel: "hard",
    });
    expect(isFixFormValid(values, options)).toBe(true);
  });

  it("accepts an image question with a question image", () => {
    const ids = OPTION_LABELS.map((_, index) => `550e8400-e29b-41d4-a716-44665544000${index}`);
    const { options, values } = normalizeFailedQuestionForm({
      optionType: "image",
      options: ids.map((id) => ({
        id,
        type: "image",
        image: { key: "k", bucket: "b" },
      })),
      questionText: {
        en: { text: "", image: { key: "qk", bucket: "b" } },
        ml: { text: "", image: null },
      },
      correctAnswer: ids[0],
      explanation: { en: "Because", ml: "", image: null },
      subject: OBJECT_ID,
      topic: OBJECT_ID,
      exams: [OBJECT_ID],
      difficultyLevel: "easy",
    });
    expect(isFixFormValid(values, options)).toBe(true);
  });

  it("rejects incomplete forms", () => {
    const { options, values } = normalizeFailedQuestionForm({
      optionType: "text",
      options: OPTION_LABELS.map((label, index) => ({
        id: `550e8400-e29b-41d4-a716-44665544000${index}`,
        type: "text",
        en: `Option ${label}`,
      })),
      questionText: { en: { text: "Q?", image: null }, ml: { text: "", image: null } },
      correctAnswer: "550e8400-e29b-41d4-a716-446655440000",
      explanation: { en: "Because", ml: "", image: null },
      subject: OBJECT_ID,
      topic: OBJECT_ID,
      exams: [OBJECT_ID],
      difficultyLevel: "easy",
    });

    expect(isFixFormValid(undefined, options)).toBe(false);
    expect(isFixFormValid(values, options.slice(0, 3))).toBe(false);
    expect(
      isFixFormValid(
        { ...values, questionText: { ...values.questionText, en: { text: " ", image: null } } },
        options
      )
    ).toBe(false);
    expect(isFixFormValid({ ...values, optionType: "image" }, options)).toBe(false);
    expect(
      isFixFormValid({ ...values, optionType: "other" as FixFormValues["optionType"] }, options)
    ).toBe(false);
    expect(
      isFixFormValid(
        {
          ...values,
          options: values.options.map((option, index) =>
            index === 0 ? { ...option, en: " " } : option
          ),
        },
        options
      )
    ).toBe(false);
    expect(isFixFormValid({ ...values, correctAnswer: "missing" }, options)).toBe(false);
    expect(isFixFormValid({ ...values, subject: "bad" }, options)).toBe(false);
    expect(isFixFormValid({ ...values, exams: [] }, options)).toBe(false);
    expect(isFixFormValid({ ...values, explanation: { ...values.explanation, en: " " } }, options)).toBe(
      false
    );
    expect(isFixFormValid({ ...values, difficultyLevel: undefined }, options)).toBe(false);
  });
});
