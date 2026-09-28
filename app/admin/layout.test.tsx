import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminSession } from "@/lib/fetch-admin-session";
import { instanceConfigApi } from "@/app/services/ezprep-api/instance-config";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";
import AdminLayout from "./layout";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

vi.mock("@/lib/fetch-admin-session", () => ({
  fetchAdminSession: vi.fn(),
}));

vi.mock("@/app/services/ezprep-api/instance-config", () => ({
  instanceConfigApi: {
    get: vi.fn(),
  },
}));

const replace = vi.fn();
const refresh = vi.fn();
const fetchMock = vi.fn();
const getConfig = vi.mocked(instanceConfigApi.get);

const savedConfig = {
  id: "singleton",
  schemaVersion: 1,
  name: "ExamFlex",
  logoUrl: "https://cdn.example.com/logo.png",
  faviconUrl: "https://cdn.example.com/favicon.ico",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

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
    getConfig.mockReset();
    getConfig.mockResolvedValue({
      message: "Instance configuration has not been set",
      data: null,
    });
    document.title = "Mock Test Admin";
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
    expect(document.querySelector("img")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Go to admin dashboard" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(getConfig).toHaveBeenCalledTimes(1);
  });

  it("does not load configuration before the session is accepted", async () => {
    mockSession(401);
    render(<AdminLayout>Secret page</AdminLayout>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(getConfig).not.toHaveBeenCalled();
  });

  it("shows the saved logo and title", async () => {
    mockSession(200);
    getConfig.mockResolvedValue({
      message: "ok",
      data: savedConfig,
    });

    render(<AdminLayout>Secret page</AdminLayout>);

    const logo = await screen.findByRole("img", { name: "ExamFlex" });
    expect(logo).toHaveAttribute("src", "https://cdn.example.com/logo.png");
    expect(
      screen.getByRole("link", { name: "Go to ExamFlex dashboard" })
    ).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe("ExamFlex"));
  });

  it("shows the name when no logo has been saved", async () => {
    mockSession(200);
    getConfig.mockResolvedValue({
      message: "ok",
      data: { ...savedConfig, logoUrl: null, faviconUrl: null },
    });

    render(<AdminLayout>Secret page</AdminLayout>);

    expect(await screen.findByText("ExamFlex")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });

  it("returns to login when loading configuration is unauthorized", async () => {
    mockSession(200);
    getConfig.mockRejectedValue(
      new EzPrepApiError("unauthorized", 401, "/v1/instance-config", null)
    );

    render(<AdminLayout>Secret page</AdminLayout>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("Secret page")).not.toBeInTheDocument();
  });

  it("opens the admin without branding when configuration cannot be loaded", async () => {
    mockSession(200);
    getConfig.mockRejectedValue(new Error("offline"));

    render(<AdminLayout>Secret page</AdminLayout>);

    expect(await screen.findByText("Secret page")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
    expect(document.title).toBe("Mock Test Admin");
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
