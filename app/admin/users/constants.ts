export const TIER_STYLES: Record<
  string,
  { label: string; color: string; background: string }
> = {
  none: {
    label: "No tier",
    color: "#8c8c8c",
    background: "#fafafa",
  },
  bronze: {
    label: "Bronze",
    color: "#ad4e00",
    background: "#fff2e8",
  },
  silver: {
    label: "Silver",
    color: "#434343",
    background: "#f0f0f0",
  },
  gold: {
    label: "Gold",
    color: "#ad6800",
    background: "#fffbe6",
  },
  platinum: {
    label: "Platinum",
    color: "#08979c",
    background: "#e6fffb",
  },
};

export function tierStyle(tier?: string) {
  return TIER_STYLES[tier ?? "none"] ?? TIER_STYLES.none;
}

const FREE_ACCESS = {
  color: "#595959",
  background: "#f5f5f5",
  accent: "#8c8c8c",
};

const PAID_ACCESS = {
  color: "#0958d9",
  background: "#e6f4ff",
  accent: "#1677ff",
};

export const BADGE_TIER_TOOLTIP = "Earned badges, not a paid plan.";

export function badgeTierLabel(tier?: string) {
  return `Badge · ${tierStyle(tier).label}`;
}

export function accessPresentation(
  access?: { paid?: boolean; usableCount?: number } | null
) {
  const paid = access?.paid === true;
  const count =
    typeof access?.usableCount === "number" && Number.isFinite(access.usableCount)
      ? Math.max(0, Math.trunc(access.usableCount))
      : 0;
  if (!paid) {
    return {
      label: "Free",
      ...FREE_ACCESS,
    };
  }
  return {
    label: count > 0 ? `Paid · ${count}` : "Paid",
    ...PAID_ACCESS,
  };
}
