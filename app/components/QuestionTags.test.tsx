import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuestionTags, questionTagColor } from "./QuestionTags";

describe("QuestionTags", () => {
  it("shows No Tags when a question has none", () => {
    render(<QuestionTags />);
    expect(screen.getByText("No Tags")).toBeInTheDocument();
  });

  it("gives each tag name its own stable color", () => {
    render(<QuestionTags tags={["Scales", "Projection", "Scales"]} />);
    expect(screen.getByText("Scales")).toBeInTheDocument();
    expect(screen.getByText("Projection")).toBeInTheDocument();
    expect(screen.getAllByText("Scales")).toHaveLength(1);
    expect(questionTagColor("Scales")).toBe(questionTagColor("Scales"));
    expect(questionTagColor("Scales")).not.toBe(questionTagColor("Projection"));
    expect(questionTagColor("A")).not.toBe(questionTagColor("B"));
  });
});
