"use client";

import {
  AlertOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  EyeOutlined,
  FieldTimeOutlined,
  FileDoneOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  RollbackOutlined,
  SafetyCertificateOutlined,
  ShoppingOutlined,
  SwapOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Typography } from "antd";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  WEBHOOK_REENABLE_NOTE,
  commerceHealthApi,
  healthCards,
  type CommerceHealthReport,
  type HealthCardModel,
} from "@/app/services/ezprep-api/commerce-health";
import { formatEzPrepError } from "@/app/services/ezprep-api";

const { Title, Paragraph } = Typography;

const FLAG_LABELS: Record<keyof CommerceHealthReport["flags"], string> = {
  commerceEnabled: "Commerce enabled",
  paymentProvider: "Payment provider",
  instanceId: "Instance id",
  invoicesEnabled: "Invoices enabled",
  reconciliationEnabled: "Reconciliation enabled",
  accessEnforcementMode: "Access enforcement mode",
  webhookRetryWindowMinutes: "Webhook retry window (minutes)",
  lateCaptureWatchHours: "Late capture watch (hours)",
  reconciliationBatch: "Reconciliation batch",
  reconciliationMaxAttempts: "Reconciliation max attempts",
  refundUnknownWindowMinutes: "Refund unknown window (minutes)",
};

const CARD_META: Record<string, { description: string; icon: ReactNode }> = {
  pendingPastWindow: {
    description:
      "Orders still waiting after the usual payment window. They were not paid or closed in time.",
    icon: <ClockCircleOutlined />,
  },
  needsReview: {
    description:
      "Orders flagged for someone to check by hand. Open one to see why it needs a decision.",
    icon: <WarningOutlined />,
  },
  underLateWatch: {
    description:
      "Paid orders still inside the 72-hour late-capture watch. A payment can still arrive.",
    icon: <EyeOutlined />,
  },
  lateCaptures7d: {
    description:
      "Payments captured later than usual, in the last 7 days. The money arrived after the order had moved on.",
    icon: <FieldTimeOutlined />,
  },
  paidUnprovisioned: {
    description:
      "Paid orders that have not unlocked the purchase yet. The learner paid, but access was not granted.",
    icon: <ShoppingOutlined />,
  },
  paidWithoutInvoice: {
    description:
      "Paid orders that still have no invoice. The sale is complete, but the bill was not created.",
    icon: <FileTextOutlined />,
  },
  invoiceWithoutPdf: {
    description:
      "Invoices created without a PDF. The invoice exists, but there is no file to download.",
    icon: <FilePdfOutlined />,
  },
  invoicesIssuedLate: {
    description:
      "Invoices that went out later than expected. The bill was created after the usual time.",
    icon: <FileDoneOutlined />,
  },
  redundantPurchases: {
    description:
      "A second buy of something the learner already has. They paid again for access they already own.",
    icon: <CopyOutlined />,
  },
  duplicates: {
    description:
      "The same payment was captured more than once. The extra capture should be refunded, not treated as a new sale.",
    icon: <SwapOutlined />,
  },
  refundsUnknownOutcome: {
    description:
      "Refunds that were sent, with no final result yet. It is not clear whether the money went back.",
    icon: <QuestionCircleOutlined />,
  },
  externalRefunds7d: {
    description:
      "Refunds started outside this admin, in the last 7 days. They were made in the payment dashboard, not here.",
    icon: <RollbackOutlined />,
  },
  partialExternalRefunds: {
    description:
      "Only part of the payment was refunded outside this admin. The learner got some of the money back, not the full amount.",
    icon: <RollbackOutlined />,
  },
  refundsOnUnpaidOrders7d: {
    description:
      "A refund landed on an order that was never paid. Money was returned for a purchase that did not complete.",
    icon: <AlertOutlined />,
  },
  webhookIgnored: {
    description:
      "Payment notices skipped in the last 24 hours. They belonged to another copy of the app, or to a payment this app does not have.",
    icon: <ApiOutlined />,
  },
  sellerStateMismatches: {
    description:
      "The seller state on the order does not match the invoice. Tax may be filed against the wrong state.",
    icon: <InfoCircleOutlined />,
  },
  indexWarnings: {
    description:
      "A required index is missing. Some order lists may be slow or incomplete until it is added.",
    icon: <WarningOutlined />,
  },
  enforcementWarnings: {
    description:
      "Paid access may stay open until enforcement is turned on. Learners can still open paid papers without buying them.",
    icon: <SafetyCertificateOutlined />,
  },
};

const CARD_ACCENT: Record<string, string> = {
  pendingPastWindow: "#1677ff",
  needsReview: "#d48806",
  underLateWatch: "#08979c",
  lateCaptures7d: "#fa8c16",
  paidUnprovisioned: "#cf1322",
  paidWithoutInvoice: "#722ed1",
  invoiceWithoutPdf: "#531dab",
  invoicesIssuedLate: "#2f54eb",
  redundantPurchases: "#eb2f96",
  duplicates: "#fa541c",
  refundsUnknownOutcome: "#c41d7f",
  externalRefunds7d: "#f5222d",
  partialExternalRefunds: "#d4380d",
  refundsOnUnpaidOrders7d: "#a8071a",
  webhookIgnored: "#1d39c4",
  sellerStateMismatches: "#0958d9",
  indexWarnings: "#595959",
  enforcementWarnings: "#cf1322",
};

export default function CommerceHealthPage() {
  const [report, setReport] = useState<CommerceHealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    commerceHealthApi
      .get()
      .then((response) => {
        if (!cancelled) setReport(response.data);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(formatEzPrepError(reason, "Failed to load commerce health"));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <Paragraph type="danger">{error}</Paragraph>;
  }
  if (!report) {
    return <Paragraph>Loading commerce health</Paragraph>;
  }

  const healthy = report.status === "ok";

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-clip sm:space-y-6">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <Title level={4} className="!mb-0 !text-lg sm:!text-xl">
          Commerce health
        </Title>
        <span
          className={
            healthy
              ? "inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200"
              : "inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700 ring-1 ring-red-200"
          }
        >
          {report.status}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        {healthCards(report).map((item) => (
          <HealthCardView key={item.key} card={item} />
        ))}
      </div>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <h2 className="m-0 text-base font-semibold text-slate-900">Webhooks</h2>
        </div>
        <div className="px-4 py-1 sm:px-5">
          <InfoRow label="Last processed">{formatWhen(report.webhook.lastWebhookProcessedAt)}</InfoRow>
          <InfoRow label="Signature rejections">
            {report.webhook.signatureRejections1h} in the last hour,{" "}
            {report.webhook.signatureRejections24h} in 24 hours
          </InfoRow>
          <InfoRow label="Failed / ignored (24 hours)">
            {report.webhook.failed24h} failed, {report.webhook.ignored24h} ignored
          </InfoRow>
          <InfoRow label="Silent while paid">{report.webhook.webhookSilentWhilePaid ? "Yes" : "No"}</InfoRow>
          <Paragraph className="!mb-4 !mt-3 text-sm leading-6 text-slate-600">
            {WEBHOOK_REENABLE_NOTE}
          </Paragraph>
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <h2 className="m-0 text-base font-semibold text-slate-900">Effective flags</h2>
        </div>
        <dl className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
          {(Object.keys(FLAG_LABELS) as Array<keyof CommerceHealthReport["flags"]>).map((key) => (
            <div key={key} className="min-w-0 rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
              <dt className="text-xs font-medium leading-5 text-slate-500">{FLAG_LABELS[key]}</dt>
              <dd className="m-0 mt-1 break-words text-sm font-semibold text-slate-900">
                {formatFlagValue(report.flags[key])}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function HealthCardView({ card }: { card: HealthCardModel }) {
  const accent = CARD_ACCENT[card.key] ?? "#1677ff";
  const meta = CARD_META[card.key];
  const needsAttention = card.count > 0;

  return (
    <article
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-solid bg-white shadow-sm sm:flex-row"
      style={{
        borderColor: `${accent}33`,
        borderTopWidth: 4,
        borderTopColor: accent,
      }}
    >
      <div
        className="flex items-center gap-3 border-b border-solid px-4 py-4 sm:w-64 sm:shrink-0 sm:flex-col sm:items-start sm:justify-center sm:gap-4 sm:border-b-0 sm:border-r sm:px-5 sm:py-6 lg:w-[52%]"
        style={{ background: `${accent}12`, borderColor: `${accent}24` }}
      >
        <span
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl lg:h-16 lg:w-16 lg:text-3xl"
          style={{ color: accent, background: `${accent}22` }}
        >
          {meta?.icon ?? <InfoCircleOutlined />}
        </span>
        <p className="m-0 text-sm leading-5 text-slate-600 lg:text-[15px] lg:leading-6">
          {meta?.description ?? "Something in commerce needs a look."}
        </p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
          <h3 className="m-0 min-w-0 flex-1 text-base font-semibold leading-snug text-slate-900">
            {card.title}
          </h3>
          <span
            className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-2xl px-2.5 text-xl font-bold tabular-nums leading-none"
            style={{
              color: needsAttention ? "#ffffff" : accent,
              background: needsAttention ? accent : `${accent}1f`,
              boxShadow: needsAttention
                ? `0 8px 18px ${accent}44`
                : `inset 0 0 0 1px ${accent}40`,
            }}
          >
            {card.count}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200/90">
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Oldest</p>
            <p className="m-0 mt-1 break-words text-sm font-medium text-slate-800">
              {card.oldestAt ? formatWhen(card.oldestAt) : "—"}
            </p>
          </div>

          {card.detail ? (
            <p className="m-0 break-words text-sm leading-6 text-slate-600">{card.detail}</p>
          ) : null}

          {card.orderNumbers.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {card.orderNumbers.map((orderNumber) => (
                <li key={orderNumber} className="min-w-0">
                  <Link
                    href={`/admin/orders?search=${encodeURIComponent(orderNumber)}`}
                    className="inline-flex max-w-full min-h-10 items-center break-all rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold !text-blue-700 !underline decoration-2 underline-offset-4 hover:bg-blue-100"
                  >
                    {orderNumber}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {card.flag ? (
            <div className="mt-auto border-t border-slate-200 pt-4">
              <Link
                href={`/admin/orders?flag=${card.flag}`}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold !text-white shadow-sm !no-underline hover:bg-blue-700 sm:w-auto"
              >
                Filtered orders
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-sm font-medium text-slate-900 sm:text-right">
        {children}
      </span>
    </div>
  );
}

function formatFlagValue(value: boolean | number | string): string {
  if (typeof value === "boolean") return value ? "On" : "Off";
  return String(value);
}

function formatWhen(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN");
}
