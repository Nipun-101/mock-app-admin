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
      repair: vi.fn(),
    },
  };
});

import { ordersApi } from "@/app/services/ezprep-api";

const getOrder = vi.mocked(ordersApi.get);
const refundOrder = vi.mocked(ordersApi.refund);
const repairOrder = vi.mocked(ordersApi.repair);

const paidOrder: AdminOrderDetail = {
  id: "order1",
  orderNumber: "ORD-1001",
  userId: "user1",
  user: {
    id: "user1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    phoneNumber: "+919876543210",
    username: "ada",
  },
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
    repairOrder.mockReset();
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
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("a***@example.com")).toBeInTheDocument();
    expect(screen.getByText("+91**********")).toBeInTheDocument();
    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("+919876543210")).not.toBeInTheDocument();
    expect(screen.getByText("ada")).toBeInTheDocument();
    expect(screen.queryByText("user1")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refund" })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Reason for this full refund"), {
      target: { value: "customer request" },
    });
    fireEvent.change(screen.getByPlaceholderText("Type the order number"), {
      target: { value: "ORD-1001" },
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

  it("hides the refund form while a refund is still initiated", async () => {
    getOrder.mockResolvedValue({
      message: "ok",
      data: {
        ...paidOrder,
        refund: {
          id: "rf1",
          status: "INITIATED",
          amount: 99900,
          reason: "testing",
          provider: "razorpay",
          providerRefundId: "rfnd_TmAYE2JW0SAI1e",
        },
      },
    });

    renderPage();

    expect(await screen.findByText(/INITIATED/)).toBeInTheDocument();
    expect(screen.getByText(/rfnd_TmAYE2JW0SAI1e/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refund" })).not.toBeInTheDocument();
  });

  it("shows the GST breakdown, including a fallback supply type", async () => {
    getOrder.mockResolvedValue({
      message: "ok",
      data: {
        ...paidOrder,
        billing: { name: "Ada Lovelace", state: "Kerala", stateCode: "32" },
        tax: {
          grossAmount: 99900,
          taxableAmount: 84662,
          taxAmount: 15238,
          cgst: 7619,
          sgst: 7619,
          igst: 0,
          taxRate: 18,
          supplyType: "INTRA_STATE",
          sellerStateCode: "32",
          buyerStateCode: "32",
        },
      },
    });

    renderPage();

    expect(await screen.findByText("Intra-state")).toBeInTheDocument();
    expect(screen.getByText("Kerala (32)")).toBeInTheDocument();
    expect(screen.getByText("18%")).toBeInTheDocument();
    expect(screen.getByText("₹846.62")).toBeInTheDocument();
    expect(screen.getAllByText("₹76.19")).toHaveLength(2);
  });

  it("labels an old order without supplyType from the IGST amount", async () => {
    getOrder.mockResolvedValue({
      message: "ok",
      data: {
        ...paidOrder,
        tax: {
          grossAmount: 99900,
          taxableAmount: 84661,
          taxAmount: 15239,
          cgst: 0,
          sgst: 0,
          igst: 15239,
          taxRate: 18,
        },
      },
    });

    renderPage();

    expect(await screen.findByText("Inter-state")).toBeInTheDocument();
    expect(screen.getByText("₹152.39")).toBeInTheDocument();
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
    fireEvent.change(screen.getByPlaceholderText("Type the order number"), {
      target: { value: "ORD-1001" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Refund" }));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith("Order is already refunded");
    });
  });

  it("keeps refund disabled until the order number matches", async () => {
    renderPage();
    const button = await screen.findByRole("button", { name: "Refund" });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Reason for this full refund"), {
      target: { value: "customer request" },
    });
    fireEvent.change(screen.getByPlaceholderText("Type the order number"), {
      target: { value: "ORD-9999" },
    });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Type the order number"), {
      target: { value: "ORD-1001" },
    });
    expect(button).toBeEnabled();
  });

  it("retries provisioning when the paid order has no invoice", async () => {
    getOrder.mockResolvedValue({
      message: "ok",
      data: { ...paidOrder, invoice: null, provisionedAt: null },
    });
    repairOrder.mockResolvedValue({
      message: "Order repaired successfully",
      data: paidOrder,
    });

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Retry provisioning" }));

    await waitFor(() => {
      expect(repairOrder).toHaveBeenCalledWith("order1");
    });
    expect(message.success).toHaveBeenCalledWith("Order repaired successfully");
  });

  it("shows late capture, a redundant purchase, an external refund, and duplicate payments", async () => {
    getOrder.mockResolvedValue({
      message: "ok",
      data: {
        ...paidOrder,
        lateCaptureAt: "2026-10-11T03:30:00.000Z",
        redundantPurchase: true,
        refund: {
          id: "rf1",
          status: "COMPLETED",
          amount: 99900,
          reason: "provider_dashboard",
          provider: "razorpay",
          initiatedBySource: "PROVIDER",
        },
        duplicatePayments: [
          {
            id: "dup1",
            providerPaymentId: "pay_dup",
            amount: 99900,
            currency: "INR",
            status: "REFUNDED",
            refundStatus: "COMPLETED",
          },
        ],
      },
    });

    renderPage();

    expect(await screen.findByText("Redundant purchase")).toBeInTheDocument();
    expect(screen.getByText("External refund")).toBeInTheDocument();
    expect(screen.getByText("Late capture")).toBeInTheDocument();
    expect(screen.getByText(/pay_dup/)).toBeInTheDocument();
    expect(screen.getByText(/refund COMPLETED/)).toBeInTheDocument();
  });
});
