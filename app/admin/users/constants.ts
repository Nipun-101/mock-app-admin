export const PLAN_STYLES: Record<
  string,
  { label: string; color: string; background: string }
> = {
  free: {
    label: "Free",
    color: "#595959",
    background: "#f5f5f5",
  },
  basic: {
    label: "Basic",
    color: "#0958d9",
    background: "#e6f4ff",
  },
  premium: {
    label: "Premium",
    color: "#531dab",
    background: "#f9f0ff",
  },
  enterprise: {
    label: "Enterprise",
    color: "#ad4e00",
    background: "#fff7e6",
  },
};

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

export const PLAN_ACCENT: Record<string, string> = {
  free: "#8c8c8c",
  basic: "#1677ff",
  premium: "#722ed1",
  enterprise: "#d48806",
};

export function planStyle(plan?: string) {
  return PLAN_STYLES[plan ?? "free"] ?? PLAN_STYLES.free;
}

export function tierStyle(tier?: string) {
  return TIER_STYLES[tier ?? "none"] ?? TIER_STYLES.none;
}

export function planAccent(plan?: string) {
  return PLAN_ACCENT[plan ?? "free"] ?? PLAN_ACCENT.free;
}
