import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";
import { showConfirmModal } from "@/components/ConfirmModal";
import OrderDetailPage from "./page";
import type { AdminOrderDetail } from "@/app/services/ezprep-api";

const { push } = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/ConfirmModal", () => ({
  showConfirmModal: vi.fn(({ onConfirm }: { onConfirm: () => void }) => onConfirm()),
}));

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    ordersApi: {
      get: vi.fn(),
      list: vi.fn(),
      refund: vi.fn(),
    },
  };
});

import { ordersApi } from "@/app/services/ezprep-api";

const getOrder = vi.mocked(ordersApi.get);
const refundOrder = vi.mocked(ordersApi.refund);

const paidOrder: AdminOrderDetail = {
  id: "order1",
  orderNumber: "ORD-1001",
  userId: "user1",
  status: "PAID",
  amount: 99900,
  currency: "INR",
  payment: {
    id: "pay1",
    status: "CAPTURED",
    provider: "fake",
    amount: 99900,
    currency: "INR",
  },
  invoice: {
    id: "inv1",
    invoiceNumber: "EZPREP/2026-27/0001",
    status: "ISSUED",
  },
  refund: null,
  items: [],
};

function paramsPromise() {
  const value = { id: "order1" };
  return {
    status: "fulfilled" as const,
    value,
    then(onFulfilled?: (v: { id: string }) => unknown) {
      return Promise.resolve(onFulfilled ? onFulfilled(value) : value);
    },
  } as unknown as Promise<{ id: string }>;
}

function renderPage() {
  return render(<OrderDetailPage params={paramsPromise()} />);
}

describe("OrderDetailPage", () => {
  beforeEach(() => {
    getOrder.mockReset();
    refundOrder.mockReset();
    push.mockReset();
    vi.mocked(showConfirmModal).mockClear();
    getOrder.mockResolvedValue({ message: "ok", data: paidOrder });
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.spyOn(message, "warning").mockImplementation(
      (() => undefined) as unknown as typeof message.warning
    );
  });

  it("confirms a refund and shows the success message", async () => {
    refundOrder.mockResolvedValue({
      message: "Order refunded",
      data: {
        refund: {
          id: "rf1",
          status: "COMPLETED",
          amount: 99900,
          reason: "customer request",
          provider: "fake",
        },
        order: { ...paidOrder, status: "REFUNDED" },
      },
    });

    renderPage();
    expect(await screen.findByRole("button", { name: "Refund" })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Reason for this full refund"), {
      target: { value: "customer request" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Refund" }));

    expect(showConfirmModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Refund this order?",
        content:
          "This refunds the full amount and revokes access granted by this order. It does not change the tax invoice.",
      })
    );
    await waitFor(() => {
      expect(refundOrder).toHaveBeenCalledWith("order1", {
        reason: "customer request",
      });
    });
    expect(message.success).toHaveBeenCalledWith("Order refunded");
  });

  it("shows an API error", async () => {
    refundOrder.mockRejectedValue(
      new EzPrepApiError("Order is already refunded", 409, "/v1/admin/orders/order1/refunds", {
        message: "Order is already refunded",
      })
    );

    renderPage();
    fireEvent.change(await screen.findByPlaceholderText("Reason for this full refund"), {
      target: { value: "again" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Refund" }));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith("Order is already refunded");
    });
  });
});
