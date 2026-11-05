import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrdersPage from "./page";

const searchParams = vi.hoisted(() => new URLSearchParams());
const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => searchParams,
}));

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    ordersApi: {
      ...actual.ordersApi,
      list: vi.fn(),
    },
  };
});

import { ordersApi } from "@/app/services/ezprep-api";

const listOrders = vi.mocked(ordersApi.list);

describe("OrdersPage flag filter", () => {
  beforeEach(() => {
    searchParams.forEach((_value, key) => searchParams.delete(key));
    push.mockReset();
    listOrders.mockReset();
    listOrders.mockResolvedValue({ message: "ok", data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } });
  });

  it("loads the flag from the query string", async () => {
    searchParams.set("flag", "unprovisioned");
    render(<OrdersPage />);
    await waitFor(() => {
      expect(listOrders).toHaveBeenCalledWith(
        expect.objectContaining({ flag: "unprovisioned" })
      );
    });
    expect(screen.getByText("Unprovisioned")).toBeInTheDocument();
  });

  it("links the user column to the learner detail page", async () => {
    listOrders.mockResolvedValue({
      message: "ok",
      data: [
        {
          id: "o1",
          orderNumber: "ORD-1",
          userId: "u1",
          user: {
            id: "u1",
            name: "Anita Sharma",
            email: "a***@gmail.com",
          },
          status: "PAID",
          amount: 49900,
          currency: "INR",
          createdAt: "2026-01-15T00:00:00.000Z",
        },
      ],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });

    render(<OrdersPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Anita Sharma" }));
    expect(push).toHaveBeenCalledWith("/admin/users/u1");
  });
});
