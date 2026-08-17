import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Select, { filterSelectOption } from "./SearchableSelect";

describe("filterSelectOption", () => {
  it("matches every option when the needle is empty or whitespace", () => {
    expect(filterSelectOption("", { label: "Alpha" })).toBe(true);
    expect(filterSelectOption("   ", { value: "beta" })).toBe(true);
    expect(filterSelectOption("", undefined)).toBe(true);
  });

  it("matches against label, value, and title", () => {
    expect(filterSelectOption("alp", { label: "Alpha" })).toBe(true);
    expect(filterSelectOption("42", { value: 42 })).toBe(true);
    expect(filterSelectOption("hint", { title: "Search hint" })).toBe(true);
    expect(filterSelectOption("zzz", { label: "Alpha", value: "a" })).toBe(false);
  });

  it("walks nested React children when collecting text", () => {
    const label = createElement(
      "span",
      null,
      "Math ",
      createElement("strong", null, "Algebra")
    );

    expect(filterSelectOption("algebra", { label })).toBe(true);
    expect(filterSelectOption("math", { label })).toBe(true);
    expect(filterSelectOption("geometry", { label })).toBe(false);
  });

  it("joins array labels and ignores booleans", () => {
    expect(
      filterSelectOption("hello", {
        label: [false, "Hello", true, createElement("em", null, "World")],
      })
    ).toBe(true);
    expect(filterSelectOption("true", { label: true, value: "x" })).toBe(false);
    expect(filterSelectOption("world", { label: [null, "World"] })).toBe(true);
  });

  it("does not match objects that are not React nodes", () => {
    expect(
      filterSelectOption("hello", { label: { foo: "hello" } as never })
    ).toBe(false);
  });
});

describe("SearchableSelect", () => {
  it("renders a searchable Ant Design select", () => {
    render(
      <Select
        options={[{ value: "a", label: "Alpha" }]}
        placeholder="Pick one"
      />
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
