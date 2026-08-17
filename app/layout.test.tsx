import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Inter: () => ({ className: "font-inter" }),
}));

vi.mock("./globals.css", () => ({}));

import RootLayout, { metadata } from "./layout";

describe("RootLayout", () => {
  it("exports admin metadata", () => {
    expect(metadata).toEqual({
      title: "Mock Test Admin",
      description: "Admin console for questions, papers, catalog, and uploads",
    });
  });

  it("renders children with the Inter font class", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <span>dashboard</span>
      </RootLayout>
    );

    expect(html).toContain("dashboard");
    expect(html).toContain('lang="en"');
    expect(html).toContain("font-inter");
  });
});
