import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("mathpix-markdown-it", () => ({
  MathpixMarkdownModel: {
    markdownToHTML: (text: string) => `<span>${text}</span>`,
    getMathpixFontsStyle: () => "",
    getMathpixStyleOnly: () => "",
  },
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
