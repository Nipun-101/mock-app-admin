import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders the admin landing title, feature cards, and sign-in link", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "Mock Test Admin" })
    ).toBeInTheDocument();
    expect(screen.getByText("Staff only")).toBeInTheDocument();

    expect(screen.getByText("Question bank")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Create, edit, and bulk-import questions, then fix failed imports."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Mock papers")).toBeInTheDocument();
    expect(screen.getByText("Live snapshot")).toBeInTheDocument();
    expect(screen.getByText("Catalog & uploads")).toBeInTheDocument();

    const signIn = screen.getByRole("link", { name: /sign in to admin/i });
    expect(signIn).toHaveAttribute("href", "/login");
  });
});
