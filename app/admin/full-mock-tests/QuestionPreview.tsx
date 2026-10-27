"use client";

import { Image } from "antd";
import { usePresignedUrl } from "@/app/hooks/usePresignedUrl";
import type {
  QuestionImageRef,
  SafeQuestion,
  SafeQuestionOption,
} from "./types";
import { MathpixContent } from "./MathpixContent";

function OptionLabel({ index }: { index: number }) {
  return String.fromCharCode(65 + index);
}

function signableImage(
  image?: QuestionImageRef | null
): QuestionImageRef | null {
  if (!image?.key || !image.bucket) return null;
  return { key: image.key, bucket: image.bucket };
}

function PreviewImage({
  imageUrl,
  image,
  alt,
  width,
  height,
}: {
  imageUrl?: string | null;
  image?: QuestionImageRef | null;
  alt: string;
  width: number;
  height?: number;
}) {
  const stored = signableImage(image);
  const { url: signedUrl } = usePresignedUrl(stored);
  const src = stored ? signedUrl : imageUrl;
  if (!src) return null;

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className="object-contain"
    />
  );
}

function OptionRow({
  option,
  index,
}: {
  option: SafeQuestionOption;
  index: number;
}) {
  const optionText = option.en || option.ml || "";
  const hasImage =
    option.type === "image" &&
    Boolean(option.imageUrl || signableImage(option.image));

  return (
    <div className="flex items-center gap-2 text-sm leading-normal">
      <span className="font-medium shrink-0">
        <OptionLabel index={index} />.
      </span>
      {hasImage ? (
        <PreviewImage
          imageUrl={option.imageUrl}
          image={option.image}
          alt={`Option ${String.fromCharCode(65 + index)}`}
          width={80}
          height={80}
        />
      ) : optionText ? (
        <MathpixContent text={optionText} inline />
      ) : (
        <span>-</span>
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
  const image =
    signableImage(question.questionText?.en?.image) ||
    signableImage(question.questionText?.ml?.image);

  if (snippetOnly) {
    const snippet = text
      ? `${text.substring(0, 120)}${text.length > 120 ? "…" : ""}`
      : "";
    return (
      <div>{snippet || (imageUrl || image ? "(image question)" : "-")}</div>
    );
  }

  return (
    <div className="space-y-2 text-sm leading-normal">
      {text ? <MathpixContent text={text} /> : null}
      {imageUrl || image ? (
        <PreviewImage
          imageUrl={imageUrl}
          image={image}
          alt="Question"
          width={200}
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
