import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminSession } from "@/lib/fetch-admin-session";
import AdminLayout from "./layout";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: function MockImage({ alt }: { alt: string }) {
    return <img alt={alt} src="/logo.png" />;
  },
}));

vi.mock("@/assets/logo.png", () => ({
  default: "/logo.png",
}));

vi.mock("@/lib/fetch-admin-session", () => ({
  fetchAdminSession: vi.fn(),
}));

const replace = vi.fn();
const refresh = vi.fn();
const fetchMock = vi.fn();

function mockSession(status: number) {
  vi.mocked(fetchAdminSession).mockResolvedValue({
    status,
  } as Response);
}

async function renderReadyLayout(children = "Secret page") {
  mockSession(200);
  render(<AdminLayout>{children}</AdminLayout>);
  expect(await screen.findByText(children)).toBeInTheDocument();
}

describe("AdminLayout", () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    fetchMock.mockReset();
    vi.mocked(fetchAdminSession).mockReset();
    vi.mocked(useRouter).mockReturnValue({
      replace,
      refresh,
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(usePathname).mockReturnValue("/admin");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a loader until the session is ready", async () => {
    let resolveSession: ((value: Response) => void) | undefined;
    vi.mocked(fetchAdminSession).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveSession = resolve;
      })
    );

    const { container } = render(<AdminLayout>Secret page</AdminLayout>);

    expect(screen.queryByText("Secret page")).not.toBeInTheDocument();
    expect(container.querySelector(".ant-spin")).toBeTruthy();

    await act(async () => {
      resolveSession?.(new Response(null, { status: 200 }));
    });

    expect(await screen.findByText("Secret page")).toBeInTheDocument();
  });

  it("redirects to login on 401", async () => {
    mockSession(401);

    render(<AdminLayout>Secret page</AdminLayout>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("Secret page")).not.toBeInTheDocument();
  });

  it("redirects to login on 403", async () => {
    mockSession(403);

    render(<AdminLayout>Secret page</AdminLayout>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("Secret page")).not.toBeInTheDocument();
  });

  it("renders children when the session is ok", async () => {
    await renderReadyLayout();

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByAltText("Mock Test Admin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("signs out and returns to login when logout succeeds", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await renderReadyLayout();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(refresh).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
  });

  it("stays on the page when logout fails", async () => {
    fetchMock.mockResolvedValue({ ok: false });
    await renderReadyLayout();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("Secret page")).toBeInTheDocument();
  });

  it("stays on the page when logout throws", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await renderReadyLayout();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
  });

  it("opens and closes the sidebar from the header button", async () => {
    await renderReadyLayout();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(
      screen.getByRole("button", { name: "Close navigation" })
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(
      screen.getByRole("button", { name: "Open navigation" })
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the sidebar when Escape is pressed", async () => {
    await renderReadyLayout();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("button", { name: "Close navigation" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(
      await screen.findByRole("button", { name: "Open navigation" })
    ).toBeInTheDocument();
  });

  it("closes the sidebar when the overlay is clicked", async () => {
    mockSession(200);
    const { container } = render(<AdminLayout>Secret page</AdminLayout>);
    expect(await screen.findByText("Secret page")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const overlay = container.querySelector(".bg-black\\/50");
    expect(overlay).toBeTruthy();

    fireEvent.click(overlay!);

    expect(
      screen.getByRole("button", { name: "Open navigation" })
    ).toBeInTheDocument();
  });
});
