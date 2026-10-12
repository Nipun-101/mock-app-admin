import { ezPrepApiClient } from "./browser-client";
import { ApiItemResponse } from "./envelope";
import type { AdminOrderFlag } from "./orders";

export interface HealthSlice {
  count: number;
  oldestAt: string | null;
  orderNumbers: string[];
}

export interface CommerceHealthReport {
  status: "ok" | "degraded";
  commerceEnabled: boolean;
  flags: {
    commerceEnabled: boolean;
    paymentProvider: string;
    instanceId: string;
    invoicesEnabled: boolean;
    reconciliationEnabled: boolean;
    accessEnforcementMode: string;
    webhookRetryWindowMinutes: number;
    lateCaptureWatchHours: number;
    reconciliationBatch: number;
    reconciliationMaxAttempts: number;
    refundUnknownWindowMinutes: number;
  };
  pendingPastWindow: HealthSlice;
  needsReview: HealthSlice;
  underLateWatch: HealthSlice;
  lateCaptures7d: HealthSlice;
  paidUnprovisioned: HealthSlice;
  paidWithoutInvoice: HealthSlice;
  invoiceWithoutPdf: HealthSlice;
  invoicesIssuedLate: HealthSlice;
  redundantPurchases: HealthSlice;
  duplicates: HealthSlice & { refunded: number };
  refundsUnknownOutcome: HealthSlice;
  externalRefunds7d: HealthSlice;
  partialExternalRefunds: HealthSlice;
  refundsOnUnpaidOrders7d: HealthSlice;
  webhookIgnored: {
    otherInstance24h: number;
    foreignPayment24h: number;
  };
  webhook: {
    lastWebhookProcessedAt: string | null;
    signatureRejections1h: number;
    signatureRejections24h: number;
    failed24h: number;
    ignored24h: number;
    webhookSilentWhilePaid: boolean;
  };
  sellerStateMismatches: HealthSlice;
  indexWarnings: string[];
  enforcementWarnings: string[];
}

export interface HealthCardModel {
  key: string;
  title: string;
  count: number;
  oldestAt: string | null;
  orderNumbers: string[];
  flag?: AdminOrderFlag;
  detail?: string;
}

const emptySlice = (): HealthSlice => ({
  count: 0,
  oldestAt: null,
  orderNumbers: [],
});

export function emptyHealthReport(
  status: CommerceHealthReport["status"] = "ok"
): CommerceHealthReport {
  return {
    status,
    commerceEnabled: true,
    flags: {
      commerceEnabled: true,
      paymentProvider: "razorpay",
      instanceId: "ezprep",
      invoicesEnabled: true,
      reconciliationEnabled: false,
      accessEnforcementMode: "LEGACY",
      webhookRetryWindowMinutes: 30,
      lateCaptureWatchHours: 72,
      reconciliationBatch: 50,
      reconciliationMaxAttempts: 12,
      refundUnknownWindowMinutes: 60,
    },
    pendingPastWindow: emptySlice(),
    needsReview: emptySlice(),
    underLateWatch: emptySlice(),
    lateCaptures7d: emptySlice(),
    paidUnprovisioned: emptySlice(),
    paidWithoutInvoice: emptySlice(),
    invoiceWithoutPdf: emptySlice(),
    invoicesIssuedLate: emptySlice(),
    redundantPurchases: emptySlice(),
    duplicates: { ...emptySlice(), refunded: 0 },
    refundsUnknownOutcome: emptySlice(),
    externalRefunds7d: emptySlice(),
    partialExternalRefunds: emptySlice(),
    refundsOnUnpaidOrders7d: emptySlice(),
    webhookIgnored: { otherInstance24h: 0, foreignPayment24h: 0 },
    webhook: {
      lastWebhookProcessedAt: null,
      signatureRejections1h: 0,
      signatureRejections24h: 0,
      failed24h: 0,
      ignored24h: 0,
      webhookSilentWhilePaid: false,
    },
    sellerStateMismatches: emptySlice(),
    indexWarnings: [],
    enforcementWarnings: [],
  };
}

export function healthCards(report: CommerceHealthReport): HealthCardModel[] {
  return [
    card("pendingPastWindow", "Pending past window", report.pendingPastWindow),
    card("needsReview", "Needs review", report.needsReview, "needsReview"),
    card("underLateWatch", "Under late watch", report.underLateWatch),
    card("lateCaptures7d", "Late captures (7 days)", report.lateCaptures7d, "lateCapture"),
    card("paidUnprovisioned", "Paid, not provisioned", report.paidUnprovisioned, "unprovisioned"),
    card("paidWithoutInvoice", "Paid, no invoice", report.paidWithoutInvoice, "uninvoiced"),
    card("invoiceWithoutPdf", "Invoice without PDF", report.invoiceWithoutPdf),
    card("invoicesIssuedLate", "Invoices issued late", report.invoicesIssuedLate),
    card("redundantPurchases", "Redundant purchases", report.redundantPurchases, "redundantPurchase"),
    card("duplicates", "Duplicate payments", report.duplicates, "duplicate", `${report.duplicates.refunded} refunded`),
    card("refundsUnknownOutcome", "Refunds with unknown outcome", report.refundsUnknownOutcome),
    card("externalRefunds7d", "External refunds (7 days)", report.externalRefunds7d),
    card("partialExternalRefunds", "Partial external refunds", report.partialExternalRefunds),
    card("refundsOnUnpaidOrders7d", "Refunds on unpaid orders (7 days)", report.refundsOnUnpaidOrders7d),
    {
      key: "webhookIgnored",
      title: "Webhook ignored (24 hours)",
      count: report.webhookIgnored.otherInstance24h + report.webhookIgnored.foreignPayment24h,
      oldestAt: null,
      orderNumbers: [],
      detail: `Other instance ${report.webhookIgnored.otherInstance24h} · Foreign payment ${report.webhookIgnored.foreignPayment24h}`,
    },
    card("sellerStateMismatches", "Seller state mismatches", report.sellerStateMismatches),
    {
      key: "indexWarnings",
      title: "Index warnings",
      count: report.indexWarnings.length,
      oldestAt: null,
      orderNumbers: [],
      detail: report.indexWarnings.join(", "),
    },
    {
      key: "enforcementWarnings",
      title: "Access enforcement",
      count: report.enforcementWarnings.length,
      oldestAt: null,
      orderNumbers: [],
      detail: report.enforcementWarnings.join(" "),
    },
  ];
}

function card(
  key: string,
  title: string,
  slice: HealthSlice,
  flag?: AdminOrderFlag,
  detail?: string
): HealthCardModel {
  return {
    key,
    title,
    count: slice.count,
    oldestAt: slice.oldestAt,
    orderNumbers: slice.orderNumbers,
    flag,
    detail,
  };
}

export const WEBHOOK_REENABLE_NOTE =
  "Razorpay retries failed deliveries with backoff for 24 hours, then disables the webhook. Signature rejections mean the secret in the API env differs from the one on the Razorpay webhook. A 404 means commerce is off or the path is routed wrongly. A 502 means the API is down. Fix the cause. Then, if Razorpay disabled the webhook, open Dashboard, then Account & Settings, then Webhooks, open the webhook, and enable it. No data fix is needed. Reconciliation and the 72-hour late-capture watch settle missed payments. Within an hour, health should return to ok.";

export const commerceHealthApi = {
  get() {
    return ezPrepApiClient.get<ApiItemResponse<CommerceHealthReport>>(
      "/v1/admin/commerce/health"
    );
  },
};
