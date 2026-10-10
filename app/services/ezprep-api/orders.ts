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

export interface AdminOrderUser {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  username?: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  userId: string;
  user: AdminOrderUser | null;
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
  initiatedBySource?: "ADMIN" | "SYSTEM" | "PROVIDER";
  partial?: boolean;
}

export interface AdminDuplicatePayment {
  id: string;
  providerPaymentId?: string;
  amount: number;
  currency: string;
  status: string;
  refundStatus: RefundStatus | null;
}

export type AdminOrderFlag =
  | "needsReview"
  | "unprovisioned"
  | "uninvoiced"
  | "lateCapture"
  | "redundantPurchase"
  | "duplicate";

export interface AdminOrderTax {
  grossAmount: number;
  taxableAmount: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxRate: number;
  supplyType?: "INTRA_STATE" | "INTER_STATE";
  sellerStateCode?: string;
  buyerStateCode?: string;
}

export interface AdminOrderDetail extends AdminOrder {
  items: Array<{
    productName: string;
    durationPreset: string;
    amount: number;
  }>;
  providerOrderId?: string;
  tax?: AdminOrderTax;
  billing?: { name?: string; state?: string; stateCode?: string };
  payment: AdminOrderPayment | null;
  duplicatePayments?: AdminDuplicatePayment[];
  invoice: AdminOrderInvoice | null;
  refund: AdminOrderRefund | null;
  provisionedAt?: string | null;
  lateCaptureAt?: string | null;
  redundantPurchase?: boolean;
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
    flag?: AdminOrderFlag;
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

  repair(id: string) {
    return ezPrepApiClient.post<ApiItemResponse<AdminOrderDetail>>(
      `/v1/admin/orders/${id}/repair`,
      {}
    );
  },

  refund(id: string, body: { reason: string }) {
    return ezPrepApiClient.post<ApiItemResponse<RefundOrderResult>>(
      `/v1/admin/orders/${id}/refunds`,
      body
    );
  },
};
