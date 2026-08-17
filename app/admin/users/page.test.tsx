import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppUser } from "@/app/services/ezprep-api/users";
import UsersPage from "./page";

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    usersApi: {
      list: vi.fn(),
    },
  };
});

import { usersApi } from "@/app/services/ezprep-api";

const list = vi.mocked(usersApi.list);

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: "u1",
    name: "Anita Sharma",
    email: "anita@example.com",
    role: "user",
    isActive: true,
    testsAttendedCount: 2,
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-16T00:00:00.000Z",
    ...overrides,
  };
}

const pagination = {
  total: 1,
  page: 1,
  limit: 12,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

describe("UsersPage", () => {
  beforeEach(() => {
    list.mockReset();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.mocked(message.error).mockClear();
  });

  it("renders learners returned by the API", async () => {
    list.mockResolvedValue({
      message: "ok",
      data: [makeUser()],
      pagination,
    });

    render(<UsersPage />);

    expect(await screen.findByText("Anita Sharma")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText(/Showing 1 of 1 learner/)).toBeInTheDocument();
    expect(list).toHaveBeenCalledWith({
      page: 1,
      limit: 12,
      search: undefined,
    });
  });

  it("strips admin rows before they can appear in the UI", async () => {
    list.mockResolvedValue({
      message: "ok",
      data: [
        makeUser(),
        makeUser({
          id: "admin-1",
          name: "Root Admin",
          email: "root@ezprep.local",
          role: "admin" as AppUser["role"],
        }),
      ],
      pagination: { ...pagination, total: 2 },
    });

    render(<UsersPage />);

    expect(await screen.findByText("Anita Sharma")).toBeInTheDocument();
    expect(screen.queryByText("Root Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("root@ezprep.local")).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no learners", async () => {
    list.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });

    render(<UsersPage />);

    expect(
      await screen.findByText(/No learners yet/)
    ).toBeInTheDocument();
  });

  it("searches and resets to the first page", async () => {
    list.mockResolvedValue({
      message: "ok",
      data: [makeUser()],
      pagination,
    });

    render(<UsersPage />);
    await screen.findByText("Anita Sharma");

    const input = screen.getByPlaceholderText("Search name, email, or phone");
    fireEvent.change(input, { target: { value: "  anita  " } });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(list).toHaveBeenCalledWith({
        page: 1,
        limit: 12,
        search: "anita",
      })
    );
  });

  it("searches when Enter is pressed and clears the filter when the input is emptied", async () => {
    list.mockResolvedValue({
      message: "ok",
      data: [makeUser()],
      pagination,
    });

    render(<UsersPage />);
    await screen.findByText("Anita Sharma");

    const input = screen.getByPlaceholderText("Search name, email, or phone");
    fireEvent.change(input, { target: { value: "anita" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() =>
      expect(list).toHaveBeenCalledWith({
        page: 1,
        limit: 12,
        search: "anita",
      })
    );

    fireEvent.change(input, { target: { value: "" } });

    await waitFor(() =>
      expect(list).toHaveBeenCalledWith({
        page: 1,
        limit: 12,
        search: undefined,
      })
    );
  });

  it("shows a search-specific empty state", async () => {
    list
      .mockResolvedValueOnce({
        message: "ok",
        data: [makeUser()],
        pagination,
      })
      .mockResolvedValueOnce({
        message: "ok",
        data: [],
        pagination: { ...pagination, total: 0 },
      });

    render(<UsersPage />);
    await screen.findByText("Anita Sharma");

    fireEvent.change(screen.getByPlaceholderText("Search name, email, or phone"), {
      target: { value: "zzz" },
    });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    expect(
      await screen.findByText("No learners match that search.")
    ).toBeInTheDocument();
  });

  it("surfaces API errors without rendering leaked rows", async () => {
    list.mockRejectedValue(new Error("nope"));

    render(<UsersPage />);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.queryByTestId("user-card")).not.toBeInTheDocument();
  });

  it("ignores a stale slower response after a newer fetch", async () => {
    let resolveSlow: ((value: unknown) => void) | undefined;
    const slow = new Promise((resolve) => {
      resolveSlow = resolve;
    });

    list
      .mockReturnValueOnce(slow as Promise<never>)
      .mockResolvedValueOnce({
        message: "ok",
        data: [makeUser({ id: "u2", name: "Bala Rao", email: "bala@example.com" })],
        pagination,
      });

    render(<UsersPage />);

    fireEvent.change(screen.getByPlaceholderText("Search name, email, or phone"), {
      target: { value: "bala" },
    });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    expect(await screen.findByText("Bala Rao")).toBeInTheDocument();

    resolveSlow?.({
      message: "ok",
      data: [makeUser({ name: "Stale Anita" })],
      pagination,
    });

    await waitFor(() => expect(screen.getByText("Bala Rao")).toBeInTheDocument());
    expect(screen.queryByText("Stale Anita")).not.toBeInTheDocument();
  });

  it("ignores a stale error after a newer successful fetch", async () => {
    let rejectSlow: ((error: unknown) => void) | undefined;
    const slow = new Promise((_, reject) => {
      rejectSlow = reject;
    });

    list
      .mockReturnValueOnce(slow as Promise<never>)
      .mockResolvedValueOnce({
        message: "ok",
        data: [makeUser({ name: "Bala Rao" })],
        pagination,
      });

    render(<UsersPage />);
    fireEvent.change(screen.getByPlaceholderText("Search name, email, or phone"), {
      target: { value: "bala" },
    });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    expect(await screen.findByText("Bala Rao")).toBeInTheDocument();
    rejectSlow?.(new Error("stale"));
    await waitFor(() => expect(screen.getByText("Bala Rao")).toBeInTheDocument());
    expect(message.error).not.toHaveBeenCalled();
  });

  it("paginates to the next page", async () => {
    list.mockResolvedValue({
      message: "ok",
      data: [makeUser()],
      pagination: {
        total: 30,
        page: 1,
        limit: 12,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: false,
      },
    });

    render(<UsersPage />);
    await screen.findByText("Anita Sharma");

    fireEvent.click(screen.getByRole("listitem", { name: "2" }));

    await waitFor(() =>
      expect(list).toHaveBeenCalledWith({
        page: 2,
        limit: 12,
        search: undefined,
      })
    );
  });

  it("falls back to the filtered list length when pagination is missing", async () => {
    list.mockResolvedValue({
      message: "ok",
      data: [makeUser(), makeUser({ id: "u2", name: "Bala Rao" })],
    });

    render(<UsersPage />);
    expect(await screen.findByText("Anita Sharma")).toBeInTheDocument();
    expect(screen.getByText(/Showing 2 of 2 learners/)).toBeInTheDocument();
  });

  it("treats a missing data array as an empty learner list", async () => {
    list.mockResolvedValue({
      message: "ok",
      data: undefined as unknown as AppUser[],
    });

    render(<UsersPage />);
    expect(
      await screen.findByText(/No learners yet/)
    ).toBeInTheDocument();
  });
});
