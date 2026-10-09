import { ezPrepApiClient } from "./browser-client";
import { ApiItemResponse, ApiListResponse } from "./envelope";

export type OrderStatus =
  | "CREATED"
  | "PENDING_PAYMENT"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED";

export type RefundStatus = "INITIATED" | "COMPLETED" | "FAILED";

export interface AdminOrder {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  paymentProvider?: string;
  paidAt?: string;
  createdAt?: string;
}

export interface AdminOrderPayment {
  id: string;
  status: string;
  provider: string;
  providerPaymentId?: string;
  amount: number;
  currency: string;
}

export interface AdminOrderInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
}

export interface AdminOrderRefund {
  id: string;
  status: RefundStatus;
  amount: number;
  reason: string;
  provider: string;
  providerRefundId?: string;
}

export interface AdminOrderDetail extends AdminOrder {
  items: Array<{
    productName: string;
    durationPreset: string;
    amount: number;
  }>;
  providerOrderId?: string;
  billing?: { name?: string };
  payment: AdminOrderPayment | null;
  invoice: AdminOrderInvoice | null;
  refund: AdminOrderRefund | null;
}

export interface RefundOrderResult {
  refund: AdminOrderRefund;
  order: AdminOrderDetail;
}

export const ordersApi = {
  list(searchParams?: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    search?: string;
  }) {
    return ezPrepApiClient.get<ApiListResponse<AdminOrder>>("/v1/admin/orders", {
      searchParams,
    });
  },

  get(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<AdminOrderDetail>>(
      `/v1/admin/orders/${id}`
    );
  },

  refund(id: string, body: { reason: string }) {
    return ezPrepApiClient.post<ApiItemResponse<RefundOrderResult>>(
      `/v1/admin/orders/${id}/refunds`,
      body
    );
  },
};
