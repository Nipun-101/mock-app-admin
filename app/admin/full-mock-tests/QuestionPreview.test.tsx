import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuestionPreview } from "./QuestionPreview";
import type { SafeQuestion } from "./types";

vi.mock("next/image", () => ({
  default: (props: { alt?: string }) => <img alt={props.alt ?? ""} />,
}));

function makeQuestion(overrides: Partial<SafeQuestion> = {}): SafeQuestion {
  return {
    _id: "q1",
    questionText: {
      en: { text: "What is the capital of India?" },
      ml: { text: null },
    },
    options: [
      { id: "a", type: "text", en: "Mumbai" },
      { id: "b", type: "text", en: "Delhi" },
    ],
    ...overrides,
  };
}

describe("QuestionPreview", () => {
  it("shows a truncated snippet for long text", () => {
    const text = "a".repeat(130);
    render(
      <QuestionPreview
        snippetOnly
        question={makeQuestion({
          questionText: { en: { text }, ml: { text: null } },
        })}
      />
    );
    expect(screen.getByText(`${"a".repeat(120)}…`)).toBeInTheDocument();
  });

  it("shows the full short snippet without an ellipsis", () => {
    render(<QuestionPreview snippetOnly question={makeQuestion()} />);
    expect(screen.getByText("What is the capital of India?")).toBeInTheDocument();
  });

  it("labels image-only snippets", () => {
    render(
      <QuestionPreview
        snippetOnly
        question={makeQuestion({
          questionText: {
            en: { text: "", imageUrl: "https://cdn.example/q.png" },
            ml: { text: null },
          },
        })}
      />
    );
    expect(screen.getByText("(image question)")).toBeInTheDocument();
  });

  it("shows a dash when snippet text and image are missing", () => {
    render(
      <QuestionPreview
        snippetOnly
        question={makeQuestion({
          questionText: { en: { text: "" }, ml: { text: null } },
        })}
      />
    );
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("falls back to Malayalam text when English is empty", () => {
    render(
      <QuestionPreview
        question={makeQuestion({
          questionText: {
            en: { text: "" },
            ml: { text: "ഇന്ത്യയുടെ തലസ്ഥാനം?" },
          },
        })}
      />
    );
    expect(screen.getByText("ഇന്ത്യയുടെ തലസ്ഥാനം?")).toBeInTheDocument();
  });

  it("renders text options and a dash for missing option text", () => {
    render(
      <QuestionPreview
        question={makeQuestion({
          options: [
            { id: "a", type: "text", en: "Mumbai" },
            { id: "b", type: "text", en: null, ml: "ഡൽഹി" },
            { id: "c", type: "text" },
          ],
        })}
      />
    );
    expect(screen.getByText("What is the capital of India?")).toBeInTheDocument();
    expect(screen.getByText("Mumbai")).toBeInTheDocument();
    expect(screen.getByText("ഡൽഹി")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("A.")).toBeInTheDocument();
  });

  it("renders image options and a question image", () => {
    render(
      <QuestionPreview
        question={makeQuestion({
          questionText: {
            en: { text: "Identify", imageUrl: "https://cdn.example/q.png" },
            ml: { text: null },
          },
          options: [
            {
              id: "a",
              type: "image",
              imageUrl: "https://cdn.example/a.png",
            },
          ],
        })}
      />
    );
    expect(screen.getByAltText("Question")).toHaveAttribute(
      "src",
      "https://cdn.example/q.png"
    );
    expect(screen.getByAltText("Option A")).toHaveAttribute(
      "src",
      "https://cdn.example/a.png"
    );
  });
});
