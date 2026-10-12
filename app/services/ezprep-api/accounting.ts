import { ezPrepApiClient } from "./browser-client";
import { ApiItemResponse } from "./envelope";

export interface MoneyTotal {
  currency: string;
  amountPaise: number;
}

export interface AccountingOverview {
  computedAt: string;
  freshUntil: string;
  people: {
    paidUsers: number;
    freeUsers: number;
    learners: number;
  };
  entitlements: {
    issued: number;
    active: number;
    expired: number;
    revoked: number;
  };
  orders: {
    paid: number;
    refunded: number;
    pending: number;
    failed: number;
    expired: number;
    cancelled: number;
  };
  catalog: {
    products: {
      published: number;
      draft: number;
      archived: number;
    };
    offers: {
      active: number;
      inactive: number;
    };
  };
  money: {
    paymentsReceived: MoneyTotal[];
    refundsIssued: MoneyTotal[];
    duplicateCaptureRefunds: MoneyTotal[];
    netReceipts: MoneyTotal[];
    taxOnPaidOrders: MoneyTotal[];
    invoicesIssued: number;
  };
}

export const accountingApi = {
  getOverview() {
    return ezPrepApiClient.get<ApiItemResponse<AccountingOverview>>(
      "/v1/admin/accounting/overview"
    );
  },
};
