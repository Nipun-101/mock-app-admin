import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommerceHealthPage from "./page";
import { emptyHealthReport } from "@/app/services/ezprep-api/commerce-health";

vi.mock("@/app/services/ezprep-api/commerce-health", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api/commerce-health")>(
    "@/app/services/ezprep-api/commerce-health"
  );
  return {
    ...actual,
    commerceHealthApi: {
      get: vi.fn(),
    },
  };
});

import { commerceHealthApi } from "@/app/services/ezprep-api/commerce-health";

const getHealth = vi.mocked(commerceHealthApi.get);

describe("CommerceHealthPage", () => {
  beforeEach(() => {
    getHealth.mockReset();
  });

  it("shows an ok snapshot", async () => {
    getHealth.mockResolvedValue({ message: "ok", data: emptyHealthReport("ok") });
    render(<CommerceHealthPage />);
    expect(await screen.findByText("ok")).toBeInTheDocument();
    expect(screen.getByText("Effective flags")).toBeInTheDocument();
    expect(screen.getByText("Commerce enabled")).toBeInTheDocument();
    expect(screen.getByText("Payment provider")).toBeInTheDocument();
    expect(screen.getByText("Access enforcement mode")).toBeInTheDocument();
    expect(screen.queryByText("commerceEnabled")).not.toBeInTheDocument();
    expect(screen.queryByText("paymentProvider")).not.toBeInTheDocument();
    expect(screen.getAllByText("On").length).toBeGreaterThan(0);
    expect(screen.getByText("Silent while paid")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("shows a degraded snapshot with a sample order and the webhook warning", async () => {
    const report = emptyHealthReport("degraded");
    report.paidUnprovisioned = {
      count: 1,
      oldestAt: "2026-10-11T01:00:00.000Z",
      orderNumbers: ["ORD-STUCK"],
    };
    report.webhook.webhookSilentWhilePaid = true;
    report.webhook.signatureRejections1h = 6;
    getHealth.mockResolvedValue({ message: "ok", data: report });

    render(<CommerceHealthPage />);

    expect(await screen.findByText("degraded")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ORD-STUCK" })).toHaveAttribute(
      "href",
      "/admin/orders?search=ORD-STUCK"
    );
    const filtered = screen.getAllByRole("link", { name: "Filtered orders" });
    expect(filtered.some((link) => link.getAttribute("href") === "/admin/orders?flag=unprovisioned")).toBe(
      true
    );
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText(/enable it/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(getHealth).toHaveBeenCalledTimes(1);
    });
  });

  it("shows the access enforcement warning when production commerce is still LEGACY", async () => {
    const report = emptyHealthReport("degraded");
    report.enforcementWarnings = [
      "ACCESS_ENFORCEMENT_MODE=LEGACY while commerce is enabled in production. Paid papers stay open until this is ENFORCED.",
    ];
    getHealth.mockResolvedValue({ message: "ok", data: report });

    render(<CommerceHealthPage />);

    expect(await screen.findByText("Access enforcement")).toBeInTheDocument();
    expect(screen.getByText(/Paid papers stay open until this is ENFORCED/)).toBeInTheDocument();
  });
});
