import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const replace = vi.fn();
const refresh = vi.fn();
const fetchMock = vi.fn();

async function submitLogin(username = "admin", password = "secret") {
  fireEvent.change(screen.getByPlaceholderText("Username"), {
    target: { value: username },
  });
  fireEvent.change(screen.getByPlaceholderText("Password"), {
    target: { value: password },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
  });
}

describe("LoginPage", () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    fetchMock.mockReset();
    vi.mocked(useRouter).mockReturnValue({
      replace,
      refresh,
    } as unknown as ReturnType<typeof useRouter>);
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState({}, "", "/login");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, "", "/");
  });

  it("renders the sign-in form", () => {
    render(<LoginPage />);

    expect(screen.getByText("Admin sign in")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeEnabled();
  });

  it("replaces to the default admin path after a successful login", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(<LoginPage />);
    await submitLogin();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin"));
    expect(refresh).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "secret" }),
    });
  });

  it("shows the API error message when login fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Account locked" }),
    });

    render(<LoginPage />);
    await submitLogin();

    expect(await screen.findByText("Account locked")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("falls back when the error body is not valid JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });

    render(<LoginPage />);
    await submitLogin();

    expect(
      await screen.findByText("Invalid username or password")
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a network error when fetch throws", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    render(<LoginPage />);
    await submitLogin();

    expect(
      await screen.findByText("Unable to sign in. Is the API running?")
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("disables the submit button while signing in", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(
      await screen.findByRole("button", { name: /signing in/i })
    ).toBeDisabled();
  });

  it("uses a same-origin next path after login", async () => {
    window.history.pushState({}, "", "/login?next=/admin/users");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(<LoginPage />);
    await submitLogin();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/users"));
  });

  it("rejects a protocol-relative next path", async () => {
    window.history.pushState({}, "", "/login?next=//evil");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(<LoginPage />);
    await submitLogin();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin"));
  });

  it("rejects a next path that points back at login", async () => {
    window.history.pushState({}, "", "/login?next=/login");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(<LoginPage />);
    await submitLogin();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin"));
  });
});
