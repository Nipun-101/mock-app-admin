export const MAX_DESCRIPTION_POINTS = 10;

export function coerceDescriptionPoints(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    );
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

export function normalizeDescriptionForSubmit(
  points?: string[]
): string[] | undefined {
  if (!points?.length) {
    return undefined;
  }
  const cleaned = points.map((point) => point.trim()).filter(Boolean);
  if (!cleaned.length) {
    return undefined;
  }
  return cleaned.slice(0, MAX_DESCRIPTION_POINTS);
}

export function formatDescriptionExcerpt(value: unknown, max = 80): string {
  const points = coerceDescriptionPoints(value);
  if (!points.length) {
    return "-";
  }
  const joined = points.join(" · ");
  return joined.length > max ? `${joined.slice(0, max)}…` : joined;
}
