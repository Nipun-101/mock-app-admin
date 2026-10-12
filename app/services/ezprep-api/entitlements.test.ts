import { beforeEach, describe, expect, it, vi } from "vitest";
import { ezPrepApiClient } from "./browser-client";
import { entitlementsApi } from "./entitlements";

vi.mock("./browser-client", () => ({
  ezPrepApiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const get = vi.mocked(ezPrepApiClient.get);
const post = vi.mocked(ezPrepApiClient.post);

const entitlement = {
  id: "ent1",
  userId: "u1",
  scopeType: "EXAM" as const,
  scopeId: "exam1",
  status: "ACTIVE" as const,
  startsAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2026-04-01T00:00:00.000Z",
  sourceType: "ADMIN_GRANT" as const,
  provisioningKey: "admin:key",
};

describe("entitlementsApi", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("lists entitlements for a user", async () => {
    get.mockResolvedValue({ message: "ok", data: [entitlement] });

    await entitlementsApi.listForUser("u1", { includeInactive: true });

    expect(get).toHaveBeenCalledWith("/v1/admin/users/u1/entitlements", {
      searchParams: { includeInactive: true },
    });
  });

  it("grants an entitlement without productId", async () => {
    post.mockResolvedValue({ message: "ok", data: entitlement });

    await entitlementsApi.grant({
      userId: "u1",
      scopeType: "EXAM",
      scopeId: "exam1",
      durationPreset: "3M",
      reason: "support",
    });

    expect(post).toHaveBeenCalledWith("/v1/admin/entitlements/grant", {
      userId: "u1",
      scopeType: "EXAM",
      scopeId: "exam1",
      durationPreset: "3M",
      reason: "support",
    });
  });

  it("revokes an entitlement with optional reason", async () => {
    post.mockResolvedValue({
      message: "ok",
      data: { ...entitlement, status: "REVOKED" },
    });

    await entitlementsApi.revoke("ent1", { reason: "support revoke" });

    expect(post).toHaveBeenCalledWith("/v1/admin/entitlements/ent1/revoke", {
      reason: "support revoke",
    });
  });
});
