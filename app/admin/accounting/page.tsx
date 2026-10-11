"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Col, Row, Typography, message } from "antd";
import {
  AuditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  DollarOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  LineChartOutlined,
  RollbackOutlined,
  SafetyCertificateOutlined,
  ShoppingOutlined,
  StopOutlined,
  SwapOutlined,
  TagOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { PageLoader } from "@/app/components/PageLoader";
import {
  accountingApi,
  formatEzPrepError,
  formatPaiseAsRupees,
  type AccountingOverview,
  type MoneyTotal,
} from "@/app/services/ezprep-api";

const { Title, Paragraph } = Typography;

type AccountingCard = {
  key: string;
  label: string;
  value: string;
  description: string;
  detail?: string;
  icon: ReactNode;
  accent: string;
  tint: string;
  shadow: string;
};

type AccountingSection = {
  title: string;
  intro: string;
  cards: AccountingCard[];
};

function formatCount(value: number): string {
  return value.toLocaleString("en-IN");
}

function formatMoney(rows: MoneyTotal[]): string {
  if (rows.length === 0) {
    return formatPaiseAsRupees(0);
  }
  return rows
    .map((row) =>
      row.currency === "INR"
        ? formatPaiseAsRupees(row.amountPaise)
        : `${row.currency} ${formatPaiseAsRupees(row.amountPaise).replace(/^₹/, "")}`
    )
    .join(" · ");
}

function formatUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function card(
  partial: Omit<AccountingCard, "tint" | "shadow"> & { tint: string }
): AccountingCard {
  return {
    ...partial,
    shadow: `0 10px 24px ${partial.accent}29`,
  };
}

function sections(overview: AccountingOverview): AccountingSection[] {
  const { people, entitlements, orders, catalog, money } = overview;
  return [
    {
      title: "People",
      intro: "Paid access is a usable entitlement, not the profile plan.",
      cards: [
        card({
          key: "paid-users",
          label: "Paid users",
          value: formatCount(people.paidUsers),
          description: "Distinct accounts with a usable entitlement right now.",
          icon: <CrownOutlined />,
          accent: "#1677ff",
          tint: "linear-gradient(180deg, #e6f4ff 0%, #ffffff 72%)",
        }),
        card({
          key: "free-users",
          label: "Free users",
          value: formatCount(people.freeUsers),
          description: "Learners without a usable entitlement.",
          icon: <UserOutlined />,
          accent: "#13c2c2",
          tint: "linear-gradient(180deg, #e6fffb 0%, #ffffff 72%)",
        }),
        card({
          key: "learners",
          label: "Learners",
          value: formatCount(people.learners),
          description: "Registered students, including paid and free.",
          icon: <TeamOutlined />,
          accent: "#2f54eb",
          tint: "linear-gradient(180deg, #f0f5ff 0%, #ffffff 72%)",
        }),
      ],
    },
    {
      title: "Entitlements",
      intro: "Grants expire when their end date passes. The status stays active until then.",
      cards: [
        card({
          key: "issued",
          label: "Entitlements issued",
          value: formatCount(entitlements.issued),
          description: "Every grant ever created, including expired and revoked.",
          icon: <SafetyCertificateOutlined />,
          accent: "#722ed1",
          tint: "linear-gradient(180deg, #f9f0ff 0%, #ffffff 72%)",
        }),
        card({
          key: "active",
          label: "Active now",
          value: formatCount(entitlements.active),
          description: "Grants that still unlock content.",
          icon: <CheckCircleOutlined />,
          accent: "#52c41a",
          tint: "linear-gradient(180deg, #f6ffed 0%, #ffffff 72%)",
        }),
        card({
          key: "expired",
          label: "Entitlements expired",
          value: formatCount(entitlements.expired),
          description: "Grants whose end date has passed. Lifetime grants stay out.",
          icon: <ClockCircleOutlined />,
          accent: "#fa8c16",
          tint: "linear-gradient(180deg, #fff7e6 0%, #ffffff 72%)",
        }),
        card({
          key: "revoked",
          label: "Entitlements revoked",
          value: formatCount(entitlements.revoked),
          description: "Grants withdrawn by a refund or an admin.",
          icon: <StopOutlined />,
          accent: "#f5222d",
          tint: "linear-gradient(180deg, #fff1f0 0%, #ffffff 72%)",
        }),
      ],
    },
    {
      title: "Orders",
      intro: "A refunded order is the reversed purchase. There is no separate revoked status.",
      cards: [
        card({
          key: "paid-orders",
          label: "Orders received",
          value: formatCount(orders.paid),
          description: "Paid orders that have not been refunded.",
          detail: `Pending payment ${formatCount(orders.pending)} · Failed ${formatCount(orders.failed)}`,
          icon: <FileTextOutlined />,
          accent: "#08979c",
          tint: "linear-gradient(180deg, #e6fffb 0%, #ffffff 72%)",
        }),
        card({
          key: "refunded-orders",
          label: "Orders revoked",
          value: formatCount(orders.refunded),
          description: "Paid orders reversed after a completed refund.",
          detail: `Checkout expired ${formatCount(orders.expired)} · Cancelled ${formatCount(orders.cancelled)}`,
          icon: <RollbackOutlined />,
          accent: "#eb2f96",
          tint: "linear-gradient(180deg, #fff0f6 0%, #ffffff 72%)",
        }),
      ],
    },
    {
      title: "Catalog",
      intro: "Deleted products are left out of these counts.",
      cards: [
        card({
          key: "products",
          label: "Products",
          value: formatCount(catalog.products.published),
          description: "Published products learners can buy.",
          detail: `Draft ${formatCount(catalog.products.draft)} · Archived ${formatCount(catalog.products.archived)}`,
          icon: <ShoppingOutlined />,
          accent: "#d48806",
          tint: "linear-gradient(180deg, #fffbe6 0%, #ffffff 72%)",
        }),
        card({
          key: "offers",
          label: "Offers",
          value: formatCount(catalog.offers.active),
          description: "Active prices currently available on a product.",
          detail: `Inactive ${formatCount(catalog.offers.inactive)}`,
          icon: <TagOutlined />,
          accent: "#531dab",
          tint: "linear-gradient(180deg, #f9f0ff 0%, #ffffff 72%)",
        }),
      ],
    },
    {
      title: "Money",
      intro: "Amounts are totals in rupees. Duplicate captures are not treated as revenue.",
      cards: [
        card({
          key: "payments",
          label: "Payments received",
          value: formatMoney(money.paymentsReceived),
          description: "Primary payments that were captured, including ones later refunded.",
          icon: <DollarOutlined />,
          accent: "#1677ff",
          tint: "linear-gradient(180deg, #e6f4ff 0%, #ffffff 72%)",
        }),
        card({
          key: "refunds",
          label: "Refunds issued",
          value: formatMoney(money.refundsIssued),
          description: "Completed refunds of real orders, including partial refunds.",
          icon: <RollbackOutlined />,
          accent: "#cf1322",
          tint: "linear-gradient(180deg, #fff1f0 0%, #ffffff 72%)",
        }),
        card({
          key: "net",
          label: "Net receipts",
          value: formatMoney(money.netReceipts),
          description: "Payments received minus order refunds.",
          icon: <LineChartOutlined />,
          accent: "#237804",
          tint: "linear-gradient(180deg, #f6ffed 0%, #ffffff 72%)",
        }),
        card({
          key: "tax",
          label: "Tax on paid orders",
          value: formatMoney(money.taxOnPaidOrders),
          description: "GST still attached to orders that have not been refunded.",
          icon: <AuditOutlined />,
          accent: "#c41d7f",
          tint: "linear-gradient(180deg, #fff0f6 0%, #ffffff 72%)",
        }),
        card({
          key: "duplicate-refunds",
          label: "Duplicate capture refunds",
          value: formatMoney(money.duplicateCaptureRefunds),
          description: "Money returned for a second capture. Not included in refunds issued.",
          icon: <SwapOutlined />,
          accent: "#fa541c",
          tint: "linear-gradient(180deg, #fff2e8 0%, #ffffff 72%)",
        }),
        card({
          key: "invoices",
          label: "Invoices issued",
          value: formatCount(money.invoicesIssued),
          description: "Tax invoices generated for paid orders.",
          icon: <FileDoneOutlined />,
          accent: "#1d39c4",
          tint: "linear-gradient(180deg, #f0f5ff 0%, #ffffff 72%)",
        }),
      ],
    },
  ];
}

function AccountingCardView({ card: item }: { card: AccountingCard }) {
  return (
    <Col xs={24} sm={12} lg={8} xl={6}>
      <div
        className="h-full min-h-[176px] rounded-2xl px-5 py-4 border border-solid"
        style={{
          background: item.tint,
          borderColor: `${item.accent}33`,
          borderTopWidth: 4,
          borderTopColor: item.accent,
          boxShadow: item.shadow,
        }}
      >
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg"
          style={{ color: item.accent, background: `${item.accent}18` }}
        >
          {item.icon}
        </span>
        <p className="mt-3 mb-0 text-sm font-medium text-slate-600">{item.label}</p>
        <p
          className="mt-1 mb-2 text-3xl font-semibold leading-tight break-words"
          style={{ color: item.accent }}
        >
          {item.value}
        </p>
        <p className="mb-0 text-xs leading-5 text-slate-500">{item.description}</p>
        {item.detail ? (
          <p className="mt-2 mb-0 text-xs font-medium leading-5" style={{ color: item.accent }}>
            {item.detail}
          </p>
        ) : null}
      </div>
    </Col>
  );
}

export default function AccountingPage() {
  const [overview, setOverview] = useState<AccountingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await accountingApi.getOverview();
        if (!cancelled) {
          setOverview(response.data);
        }
      } catch (reason) {
        if (!cancelled) {
          const text = formatEzPrepError(reason, "Failed to load accounting");
          setError(text);
          message.error(text);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  if (error || !overview) {
    return <Paragraph type="danger">{error ?? "Failed to load accounting"}</Paragraph>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Title level={3} className="!mb-1">
          Accounting
        </Title>
        <Paragraph type="secondary" className="!mb-0">
          Updated {formatUpdated(overview.computedAt)} · refreshes hourly
        </Paragraph>
      </div>
      {sections(overview).map((section) => (
        <section key={section.title}>
          <Title level={4} className="!mb-1">
            {section.title}
          </Title>
          <Paragraph type="secondary" className="!mb-4">
            {section.intro}
          </Paragraph>
          <Row gutter={[16, 16]}>
            {section.cards.map((item) => (
              <AccountingCardView key={item.key} card={item} />
            ))}
          </Row>
        </section>
      ))}
    </div>
  );
}
