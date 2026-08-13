"use client";

import { Image } from "antd";
import type { SafeQuestion, SafeQuestionOption } from "./types";

function OptionLabel({ index }: { index: number }) {
  return String.fromCharCode(65 + index);
}

function OptionRow({
  option,
  index,
}: {
  option: SafeQuestionOption;
  index: number;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="font-medium shrink-0">
        <OptionLabel index={index} />.
      </span>
      {option.type === "image" && option.imageUrl ? (
        <Image
          src={option.imageUrl}
          alt={`Option ${String.fromCharCode(65 + index)}`}
          width={80}
          height={80}
          className="object-contain"
        />
      ) : (
        <span>{option.en || option.ml || "-"}</span>
      )}
    </div>
  );
}

export function QuestionPreview({
  question,
  snippetOnly = false,
}: {
  question: SafeQuestion;
  snippetOnly?: boolean;
}) {
  const text =
    question.questionText?.en?.text ||
    question.questionText?.ml?.text ||
    "";
  const imageUrl =
    question.questionText?.en?.imageUrl ||
    question.questionText?.ml?.imageUrl;

  if (snippetOnly) {
    const snippet = text ? `${text.substring(0, 120)}${text.length > 120 ? "…" : ""}` : "";
    return (
      <div>
        {snippet || (imageUrl ? "(image question)" : "-")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {text ? <div>{text}</div> : null}
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt="Question"
          width={200}
          className="object-contain"
        />
      ) : null}
      {question.options?.length ? (
        <div className="space-y-1 pl-1">
          {question.options.map((option, index) => (
            <OptionRow key={option.id || index} option={option} index={index} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
