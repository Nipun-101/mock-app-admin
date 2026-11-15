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

export type AccessProduct = {
  productId?: string;
  productName?: string;
};

function paidProductNames(
  products?: AccessProduct[] | null
): string[] {
  if (!Array.isArray(products)) {
    return [];
  }
  const names: string[] = [];
  for (const product of products) {
    const name =
      typeof product?.productName === "string" ? product.productName.trim() : "";
    if (name && !names.includes(name)) {
      names.push(name);
    }
  }
  return names;
}

/**
 * Free / paid tag for learner cards and detail.
 * Paid learners show the first product name; extras use +N (not a grant count).
 */
export function accessPresentation(
  access?: {
    paid?: boolean;
    usableCount?: number;
    products?: AccessProduct[] | null;
  } | null
) {
  const paid = access?.paid === true;
  const productNames = paidProductNames(access?.products);
  if (!paid) {
    return {
      paid: false as const,
      label: "Free",
      productNames: [] as string[],
      extraCount: 0,
      ...FREE_ACCESS,
    };
  }

  if (productNames.length === 0) {
    return {
      paid: true as const,
      label: "Paid",
      productNames,
      extraCount: 0,
      ...PAID_ACCESS,
    };
  }

  return {
    paid: true as const,
    label: productNames[0],
    productNames,
    extraCount: Math.max(0, productNames.length - 1),
    ...PAID_ACCESS,
  };
}
