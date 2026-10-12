import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountingOverview } from "@/app/services/ezprep-api";
import AccountingPage from "./page";

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    accountingApi: {
      getOverview: vi.fn(),
    },
  };
});

import { accountingApi } from "@/app/services/ezprep-api";

const getOverview = vi.mocked(accountingApi.getOverview);

const overview: AccountingOverview = {
  computedAt: "2026-10-11T08:00:00.000Z",
  freshUntil: "2026-10-11T09:00:00.000Z",
  people: { paidUsers: 42, freeUsers: 18, learners: 60 },
  entitlements: { issued: 80, active: 50, expired: 12, revoked: 6 },
  orders: {
    paid: 30,
    refunded: 4,
    pending: 5,
    failed: 2,
    expired: 3,
    cancelled: 1,
  },
  catalog: {
    products: { published: 7, draft: 2, archived: 1 },
    offers: { active: 9, inactive: 3 },
  },
  money: {
    paymentsReceived: [{ currency: "INR", amountPaise: 250000 }],
    refundsIssued: [{ currency: "INR", amountPaise: 49900 }],
    duplicateCaptureRefunds: [{ currency: "INR", amountPaise: 10000 }],
    netReceipts: [{ currency: "INR", amountPaise: 200100 }],
    taxOnPaidOrders: [{ currency: "INR", amountPaise: 38100 }],
    invoicesIssued: 28,
  },
};

describe("AccountingPage", () => {
  beforeEach(() => {
    getOverview.mockReset();
  });

  it("renders overview cards with counts and rupee totals", async () => {
    getOverview.mockResolvedValue({
      message: "Accounting overview retrieved successfully",
      data: overview,
    });

    render(<AccountingPage />);

    expect(await screen.findByRole("heading", { name: "Accounting" })).toBeInTheDocument();
    expect(screen.getByText(/refreshes hourly/)).toBeInTheDocument();
    expect(screen.getByText("Paid users")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Free users")).toBeInTheDocument();
    expect(screen.getByText("Orders received")).toBeInTheDocument();
    expect(screen.getByText("Orders revoked")).toBeInTheDocument();
    expect(screen.getByText("Entitlements issued")).toBeInTheDocument();
    expect(screen.getByText("Entitlements expired")).toBeInTheDocument();
    expect(screen.getByText("Payments received")).toBeInTheDocument();
    expect(screen.getByText("₹2,500")).toBeInTheDocument();
    expect(screen.getByText("Refunds issued")).toBeInTheDocument();
    expect(screen.getByText("₹499")).toBeInTheDocument();
    expect(screen.getByText("Net receipts")).toBeInTheDocument();
    expect(screen.getByText("₹2,001")).toBeInTheDocument();
    expect(screen.getByText(/Pending payment 5/)).toBeInTheDocument();
    expect(screen.getByText(/Draft 2/)).toBeInTheDocument();
    expect(screen.getByText(/Inactive 3/)).toBeInTheDocument();

    await waitFor(() => {
      expect(getOverview).toHaveBeenCalledTimes(1);
    });
  });
});
