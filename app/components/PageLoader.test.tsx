import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditPageShell, PageLoader } from "./PageLoader";

describe("PageLoader", () => {
  it("renders a large spinner", () => {
    const { container } = render(<PageLoader />);

    expect(container.querySelector(".ant-spin-lg")).toBeTruthy();
  });
});

describe("EditPageShell", () => {
  it("keeps children mounted but invisible while loading", () => {
    render(
      <EditPageShell loading>
        <p>form body</p>
      </EditPageShell>
    );

    const body = screen.getByText("form body");
    expect(body.parentElement).toHaveClass("invisible");
    expect(body.parentElement).toHaveClass("min-h-[50vh]");
  });

  it("shows children when loading is false", () => {
    render(
      <EditPageShell loading={false}>
        <p>form body</p>
      </EditPageShell>
    );

    const body = screen.getByText("form body");
    expect(body.parentElement).not.toHaveClass("invisible");
  });
});
