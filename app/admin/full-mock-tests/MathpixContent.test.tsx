import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MathpixContent } from "./MathpixContent";

const renderMarkdown = vi.fn((text: string) => `<span class="mmd">${text}</span>`);
const getMathpixFontsStyle = vi.fn(() => "/*fonts*/");
const getMathpixStyleOnly = vi.fn(() => "/*style*/");

vi.mock("mathpix-markdown-it", () => ({
  MathpixMarkdownModel: {
    markdownToHTML: (text: string) => renderMarkdown(text),
    getMathpixFontsStyle: () => getMathpixFontsStyle(),
    getMathpixStyleOnly: () => getMathpixStyleOnly(),
  },
}));

describe("MathpixContent", () => {
  beforeEach(() => {
    document.getElementById("Mathpix-styles")?.remove();
    renderMarkdown.mockClear();
    getMathpixFontsStyle.mockClear();
    getMathpixStyleOnly.mockClear();
    renderMarkdown.mockImplementation(
      (text: string) => `<span class="mmd">${text}</span>`
    );
  });

  it("renders nothing when text is empty", () => {
    const { container } = render(<MathpixContent text="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders mathpix HTML and injects styles once", async () => {
    const { rerender } = render(
      <MathpixContent text="Find 1/2 of 10" />
    );

    expect(await screen.findByText("Find 1/2 of 10")).toBeInTheDocument();
    expect(
      screen.getByText("Find 1/2 of 10").closest("[data-mathpix='true']")
    ).toBeTruthy();
    expect(document.getElementById("Mathpix-styles")?.innerHTML).toBe(
      "/*fonts*//*style*/"
    );
    expect(getMathpixFontsStyle).toHaveBeenCalledTimes(1);

    rerender(<MathpixContent text="next x^2" />);
    expect(await screen.findByText("next x^2")).toBeInTheDocument();
    expect(getMathpixFontsStyle).toHaveBeenCalledTimes(1);
    expect(getMathpixStyleOnly).toHaveBeenCalledTimes(1);
  });

  it("falls back to plain text when mathpix rendering fails", async () => {
    renderMarkdown.mockImplementation(() => {
      throw new Error("render failed");
    });

    render(<MathpixContent text="plain fallback" />);

    await waitFor(() => {
      expect(screen.getByText("plain fallback")).toBeInTheDocument();
    });
    expect(
      screen.getByText("plain fallback").getAttribute("data-mathpix")
    ).toBeNull();
  });
});
