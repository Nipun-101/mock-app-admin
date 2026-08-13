import { v4 as uuidv4 } from "uuid";
import { ImportQuestion, ImportQuestionOption } from "./types";

export const OPTION_COUNT = 4;
export const OPTION_LABELS = ["A", "B", "C", "D"] as const;

export interface FixOptionSlot {
  id: string;
  label: string;
}

export interface FixFormValues {
  questionText: {
    en: { text: string; image: Record<string, unknown> | null };
    ml: { text: string; image: Record<string, unknown> | null };
  };
  optionType: "text" | "image";
  options: Array<{
    id: string;
    type: "text" | "image";
    en: string;
    ml: string;
    image: Record<string, unknown> | null;
  }>;
  correctAnswer?: string;
  explanation: {
    en: string;
    ml: string;
    image: Record<string, unknown> | null;
  };
  subject?: string;
  topic?: string;
  exams: string[];
  tag?: string;
  difficultyLevel?: "easy" | "medium" | "hard";
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function isObjectId(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_RE.test(value);
}

export function toImageMetadata(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const image = value as Record<string, unknown>;
  if (typeof image.key !== "string" || !image.key.trim()) return null;
  if (typeof image.bucket !== "string" || !image.bucket.trim()) return null;
  return {
    key: image.key.trim(),
    bucket: image.bucket.trim(),
    region:
      typeof image.region === "string" && image.region.trim()
        ? image.region.trim()
        : "ap-south-1",
    ...(typeof image.contentType === "string"
      ? { contentType: image.contentType }
      : {}),
    ...(typeof image.size === "number" ? { size: image.size } : {}),
    ...(image.lastModified ? { lastModified: image.lastModified } : {}),
  };
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function normalizeFailedQuestionForm(
  draft?: Partial<ImportQuestion> | null
): { options: FixOptionSlot[]; values: FixFormValues } {
  const optionType = draft?.optionType === "image" ? "image" : "text";
  const rawOptions: ImportQuestionOption[] = Array.isArray(draft?.options)
    ? draft!.options
    : [];

  const options: FixOptionSlot[] = OPTION_LABELS.map((label, index) => ({
    id: isUuid(rawOptions[index]?.id) ? rawOptions[index].id : uuidv4(),
    label,
  }));

  const values: FixFormValues = {
    questionText: {
      en: {
        text: asText(draft?.questionText?.en?.text),
        image: toImageMetadata(draft?.questionText?.en?.image),
      },
      ml: {
        text: asText(draft?.questionText?.ml?.text),
        image: toImageMetadata(draft?.questionText?.ml?.image),
      },
    },
    optionType,
    options: options.map((option, index) => {
      const incoming = rawOptions[index];
      return {
        id: option.id,
        type: optionType,
        en: asText(incoming?.en),
        ml: asText(incoming?.ml),
        image: toImageMetadata(incoming?.image),
      };
    }),
    correctAnswer: options.some((option) => option.id === draft?.correctAnswer)
      ? draft!.correctAnswer
      : undefined,
    explanation: {
      en: asText(draft?.explanation?.en),
      ml: asText(draft?.explanation?.ml),
      image: toImageMetadata(draft?.explanation?.image),
    },
    subject: isObjectId(draft?.subject) ? draft?.subject : undefined,
    topic: isObjectId(draft?.topic) ? draft?.topic : undefined,
    exams: (draft?.exams ?? []).filter((exam) => isObjectId(exam)),
    tag: isObjectId(draft?.tag) ? draft?.tag : undefined,
    difficultyLevel:
      draft?.difficultyLevel === "easy" ||
      draft?.difficultyLevel === "medium" ||
      draft?.difficultyLevel === "hard"
        ? draft.difficultyLevel
        : undefined,
  };

  return { options, values };
}

export function isFixFormValid(
  values: FixFormValues | undefined,
  options: FixOptionSlot[]
): boolean {
  if (!values || options.length !== OPTION_COUNT) return false;

  const hasQuestionText = Boolean(values.questionText?.en?.text?.trim());
  const hasQuestionImage = Boolean(
    values.questionText?.en?.image &&
      typeof values.questionText.en.image === "object" &&
      "key" in (values.questionText.en.image as object) &&
      (values.questionText.en.image as { key?: string }).key
  );
  if (!hasQuestionText && !hasQuestionImage) return false;

  const formOptions = values.options || [];
  if (values.optionType === "image") {
    if (
      !options.every((_, index) => {
        const image = formOptions[index]?.image as { key?: string } | null;
        return Boolean(image?.key);
      })
    ) {
      return false;
    }
  } else if (values.optionType === "text") {
    if (!options.every((_, index) => formOptions[index]?.en?.trim())) {
      return false;
    }
  } else {
    return false;
  }

  if (!values.correctAnswer || !options.some((option) => option.id === values.correctAnswer)) {
    return false;
  }

  if (!isObjectId(values.subject) || !isObjectId(values.topic)) return false;
  if (!Array.isArray(values.exams) || values.exams.length === 0) return false;
  if (!values.explanation?.en?.trim()) return false;
  if (!["easy", "medium", "hard"].includes(values.difficultyLevel || "")) {
    return false;
  }

  return true;
}
