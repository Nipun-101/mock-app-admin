import { ezPrepApiClient } from "./browser-client";
import {
  ApiItemResponse,
  ApiListResponse,
  omitEmpty,
} from "./envelope";
import type { DurationPreset } from "./offers";
import type { EntitlementScopeType } from "./products";

export type EntitlementStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export type EntitlementSourceType =
  | "PAYMENT"
  | "ADMIN_GRANT"
  | "PROMOTION"
  | "TRIAL"
  | "SYSTEM";

export interface Entitlement {
  id: string;
  userId: string;
  scopeType: EntitlementScopeType;
  scopeId: string;
  status: EntitlementStatus;
  startsAt: string;
  expiresAt: string | null;
  sourceType: EntitlementSourceType;
  sourceId?: string;
  productId?: string;
  productVersion?: number;
  orderId?: string;
  provisioningKey: string;
  revokedAt?: string;
  revokeReason?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export type GrantEntitlementPayload = {
  userId: string;
  scopeType: EntitlementScopeType;
  scopeId: string;
  durationPreset: DurationPreset;
  reason?: string;
  productId?: string | null;
};

export type RevokeEntitlementPayload = {
  reason?: string;
};

export const entitlementsApi = {
  listForUser(
    userId: string,
    searchParams?: { includeInactive?: boolean }
  ) {
    return ezPrepApiClient.get<ApiListResponse<Entitlement>>(
      `/v1/admin/users/${userId}/entitlements`,
      { searchParams }
    );
  },

  grant(body: GrantEntitlementPayload) {
    return ezPrepApiClient.post<ApiItemResponse<Entitlement>>(
      "/v1/admin/entitlements/grant",
      omitEmpty(body as Record<string, unknown>)
    );
  },

  revoke(id: string, body: RevokeEntitlementPayload = {}) {
    return ezPrepApiClient.post<ApiItemResponse<Entitlement>>(
      `/v1/admin/entitlements/${id}/revoke`,
      omitEmpty(body as Record<string, unknown>)
    );
  },
};
