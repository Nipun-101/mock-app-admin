import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EzPrepApiError } from "@/app/services/ezprep-api";
import {
  EntitlementsSection,
  resolveScopeLabel,
} from "./EntitlementsSection";

const { listForUser, grant, revoke } = vi.hoisted(() => ({
  listForUser: vi.fn(),
  grant: vi.fn(),
  revoke: vi.fn(),
}));

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    entitlementsApi: {
      listForUser,
      grant,
      revoke,
    },
  };
});

vi.mock("../products/grant-options", async () => {
  const actual = await vi.importActual<typeof import("../products/grant-options")>(
    "../products/grant-options"
  );
  return {
    ...actual,
    loadGrantScopeOptions: vi.fn(async () => ({
      EXAM_GROUP: [{ value: "g1", label: "SSC Group" }],
      EXAM: [
        { value: "exam1", label: "SSC CGL" },
        { value: "exam2", label: "SSC CHSL" },
      ],
      MOCK_TEST: [
        { value: "mt1", label: "Paper One" },
        { value: "mt2", label: "Paper Two" },
      ],
    })),
  };
});

vi.mock("@/components/ConfirmModal", () => ({
  showConfirmModal: vi.fn(({ onConfirm }: { onConfirm: () => void }) =>
    onConfirm()
  ),
}));

import { showConfirmModal } from "@/components/ConfirmModal";

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

describe("resolveScopeLabel", () => {
  it("prefers catalog names and falls back to type + id", () => {
    expect(
      resolveScopeLabel("EXAM", "exam1", {
        EXAM_GROUP: [],
        EXAM: [{ value: "exam1", label: "SSC CGL" }],
        MOCK_TEST: [],
      })
    ).toBe("SSC CGL");
    expect(
      resolveScopeLabel("EXAM", "missing", {
        EXAM_GROUP: [],
        EXAM: [],
        MOCK_TEST: [],
      })
    ).toBe("EXAM · missing");
  });
});

describe("EntitlementsSection", () => {
  beforeEach(() => {
    listForUser.mockReset();
    grant.mockReset();
    revoke.mockReset();
    vi.mocked(showConfirmModal).mockClear();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.mocked(message.error).mockClear();
    vi.mocked(message.success).mockClear();
  });

  it("renders entitlements from the API", async () => {
    listForUser.mockResolvedValue({ message: "ok", data: [entitlement] });

    render(<EntitlementsSection userId="u1" />);

    expect(await screen.findByText("SSC CGL")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(screen.getByText("ADMIN_GRANT")).toBeInTheDocument();
    expect(listForUser).toHaveBeenCalledWith("u1", { includeInactive: true });
  });

  it("grants one entitlement per selected scope target", async () => {
    listForUser.mockResolvedValue({ message: "ok", data: [] });
    grant.mockResolvedValue({ message: "ok", data: entitlement });

    render(<EntitlementsSection userId="u1" />);

    expect(await screen.findByRole("button", { name: /grant access/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /grant access/i }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Grant entitlement")).toBeInTheDocument();

    const scopeSelect = within(dialog).getByLabelText("Scope");
    fireEvent.mouseDown(scopeSelect);
    fireEvent.click(await screen.findByText("SSC CGL"));
    fireEvent.click(await screen.findByText("SSC CHSL"));

    fireEvent.click(within(dialog).getByRole("button", { name: /^grant$/i }));

    await waitFor(() => {
      expect(grant).toHaveBeenCalledTimes(2);
    });
    expect(grant).toHaveBeenCalledWith({
      userId: "u1",
      scopeType: "EXAM",
      scopeId: "exam1",
      durationPreset: "3M",
      reason: undefined,
    });
    expect(grant).toHaveBeenCalledWith({
      userId: "u1",
      scopeType: "EXAM",
      scopeId: "exam2",
      durationPreset: "3M",
      reason: undefined,
    });
  });

  it("confirms revoke and calls revoke API", async () => {
    listForUser.mockResolvedValue({ message: "ok", data: [entitlement] });
    revoke.mockResolvedValue({
      message: "ok",
      data: { ...entitlement, status: "REVOKED" },
    });

    render(<EntitlementsSection userId="u1" />);

    expect(await screen.findByRole("button", { name: /revoke/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /revoke/i }));

    expect(showConfirmModal).toHaveBeenCalled();
    await waitFor(() => {
      expect(revoke).toHaveBeenCalledWith("ent1", { reason: "admin_revoke" });
    });
  });

  it("surfaces list API errors", async () => {
    listForUser.mockRejectedValue(
      new EzPrepApiError("fail", 500, "/v1/admin/users/u1/entitlements", {
        message: "boom",
      })
    );

    render(<EntitlementsSection userId="u1" />);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalled();
    });
    expect(await screen.findByText("No entitlements for this learner.")).toBeInTheDocument();
  });
});
