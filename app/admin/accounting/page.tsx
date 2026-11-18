"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Modal, Typography, message } from "antd";
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
  type PaidUsersByProduct,
  type PaidUsersByProductRow,
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
  clickable?: boolean;
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
          clickable: true,
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

function AccountingCardView({
  card: item,
  onOpen,
}: {
  card: AccountingCard;
  onOpen?: () => void;
}) {
  const body = (
    <div
      className="h-full min-w-0 rounded-2xl border border-solid px-4 py-4 sm:min-h-[168px] sm:px-5"
      style={{
        background: item.tint,
        borderColor: `${item.accent}33`,
        borderTopWidth: 4,
        borderTopColor: item.accent,
        boxShadow: item.shadow,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-base sm:h-10 sm:w-10 sm:text-lg"
          style={{ color: item.accent, background: `${item.accent}18` }}
        >
          {item.icon}
        </span>
        {item.clickable ? (
          <span className="text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-600">
            View details
          </span>
        ) : null}
      </div>
      <p className="mb-0 mt-3 text-sm font-medium text-slate-600">{item.label}</p>
      <p
        className="mb-2 mt-1 break-words text-2xl font-semibold leading-tight sm:text-3xl"
        style={{ color: item.accent }}
      >
        {item.value}
      </p>
      <p className="mb-0 text-xs leading-5 text-slate-500">{item.description}</p>
      {item.detail ? (
        <p className="mb-0 mt-2 break-words text-xs font-medium leading-5" style={{ color: item.accent }}>
          {item.detail}
        </p>
      ) : null}
    </div>
  );

  if (!item.clickable || !onOpen) {
    return body;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group h-full w-full cursor-pointer rounded-2xl border-0 bg-transparent p-0 text-left transition-transform duration-200 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ outlineColor: item.accent }}
      aria-label={`${item.label}. View details`}
    >
      {body}
    </button>
  );
}

function sharePercent(count: number, paidUsers: number): number {
  if (paidUsers <= 0 || count <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((count / paidUsers) * 100));
}

function barWidth(count: number, maxCount: number): number {
  if (maxCount <= 0 || count <= 0) {
    return 0;
  }
  return Math.max(8, Math.round((count / maxCount) * 100));
}

function PaidUsersByProductPanel({ data }: { data: PaidUsersByProduct }) {
  const maxCount = data.products.reduce(
    (highest, row) => Math.max(highest, row.userCount),
    0
  );

  if (data.products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
        <p className="mb-1 text-sm font-medium text-slate-700">No product breakdown yet</p>
        <p className="mb-0 text-xs text-slate-500">
          Paid users show up here once usable entitlements are tied to a product.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-solid border-[#1677ff33] bg-[linear-gradient(135deg,#e6f4ff_0%,#ffffff_70%)] px-4 py-3">
        <div>
          <p className="mb-0 text-xs font-semibold uppercase tracking-[0.14em] text-[#1677ff]">
            Paid reach
          </p>
          <p className="mb-0 mt-1 text-sm text-slate-600">
            Distinct learners with usable access right now
          </p>
        </div>
        <p className="mb-0 text-3xl font-semibold leading-none text-[#1677ff]">
          {formatCount(data.paidUsers)}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-solid border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_5.5rem] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:grid-cols-[3rem_minmax(0,1fr)_6.5rem_7rem]">
          <span>#</span>
          <span>Product</span>
          <span className="text-right">Users</span>
          <span className="hidden text-right sm:block">Of paid</span>
        </div>
        <ul className="mb-0 list-none p-0">
          {data.products.map((row, index) => (
            <PaidUsersProductRow
              key={row.productId || `${row.productName}-${index}`}
              row={row}
              rank={index + 1}
              paidUsers={data.paidUsers}
              maxCount={maxCount}
            />
          ))}
        </ul>
      </div>

      <p className="mb-0 text-xs leading-5 text-slate-500">
        Learners with more than one active product appear in each matching row, so
        the column total can exceed {formatCount(data.paidUsers)}.
      </p>
    </div>
  );
}

function PaidUsersProductRow({
  row,
  rank,
  paidUsers,
  maxCount,
}: {
  row: PaidUsersByProductRow;
  rank: number;
  paidUsers: number;
  maxCount: number;
}) {
  const share = sharePercent(row.userCount, paidUsers);
  const width = barWidth(row.userCount, maxCount);

  return (
    <li className="border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-[#f8fbff]">
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_5.5rem] items-center gap-3 sm:grid-cols-[3rem_minmax(0,1fr)_6.5rem_7rem]">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
          {rank}
        </span>
        <div className="min-w-0">
          <p className="mb-1 truncate text-sm font-semibold text-slate-800">
            {row.productName}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#69b1ff_0%,#1677ff_100%)] transition-[width] duration-500"
              style={{ width: `${width}%` }}
            />
          </div>
          {row.productCode ? (
            <p className="mb-0 mt-1 truncate text-[11px] uppercase tracking-[0.08em] text-slate-400">
              {row.productCode}
            </p>
          ) : null}
        </div>
        <p className="mb-0 text-right text-base font-semibold tabular-nums text-[#1677ff]">
          {formatCount(row.userCount)}
        </p>
        <p className="mb-0 hidden text-right text-sm tabular-nums text-slate-500 sm:block">
          {share}%
        </p>
      </div>
    </li>
  );
}

export default function AccountingPage() {
  const [overview, setOverview] = useState<AccountingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paidUsersOpen, setPaidUsersOpen] = useState(false);
  const [paidUsersLoading, setPaidUsersLoading] = useState(false);
  const [paidUsersBreakdown, setPaidUsersBreakdown] =
    useState<PaidUsersByProduct | null>(null);

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

  const openPaidUsers = async () => {
    setPaidUsersOpen(true);
    if (paidUsersBreakdown) {
      return;
    }
    setPaidUsersLoading(true);
    try {
      const response = await accountingApi.getPaidUsersByProduct();
      setPaidUsersBreakdown(response.data);
    } catch (reason) {
      message.error(formatEzPrepError(reason, "Failed to load paid users by product"));
      setPaidUsersOpen(false);
    } finally {
      setPaidUsersLoading(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error || !overview) {
    return <Paragraph type="danger">{error ?? "Failed to load accounting"}</Paragraph>;
  }

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-clip sm:space-y-8">
      <div>
        <Title level={3} className="!mb-1 !text-xl sm:!text-2xl">
          Accounting
        </Title>
        <Paragraph type="secondary" className="!mb-0 break-words">
          Updated {formatUpdated(overview.computedAt)} · refreshes hourly
        </Paragraph>
      </div>
      {sections(overview).map((section) => (
        <section key={section.title} className="min-w-0">
          <Title level={4} className="!mb-1 !text-lg sm:!text-xl">
            {section.title}
          </Title>
          <Paragraph type="secondary" className="!mb-3 break-words sm:!mb-4">
            {section.intro}
            {section.title === "People"
              ? " Click Paid users for the product breakdown."
              : null}
          </Paragraph>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {section.cards.map((item) => (
              <AccountingCardView
                key={item.key}
                card={item}
                onOpen={item.key === "paid-users" ? openPaidUsers : undefined}
              />
            ))}
          </div>
        </section>
      ))}

      <Modal
        open={paidUsersOpen}
        title="Paid users by product"
        footer={null}
        width={720}
        onCancel={() => setPaidUsersOpen(false)}
        destroyOnHidden
      >
        {paidUsersLoading || !paidUsersBreakdown ? (
          <PageLoader />
        ) : (
          <PaidUsersByProductPanel data={paidUsersBreakdown} />
        )}
      </Modal>
    </div>
  );
}
