import { fireEvent, render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const replace = vi.fn();

describe("AuthPage", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(useRouter).mockReturnValue({
      replace,
    } as unknown as ReturnType<typeof useRouter>);
  });

  it("redirects to login on mount", () => {
    render(<AuthPage />);

    expect(screen.getByText("Redirecting")).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("redirects to login when Continue is clicked", () => {
    render(<AuthPage />);
    replace.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(replace).toHaveBeenCalledWith("/login");
  });
});
