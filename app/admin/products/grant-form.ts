import type {
  EntitlementScopeType,
  ProductGrant,
} from "@/app/services/ezprep-api";
import type { GrantScopeOptions } from "./grant-options";

/** One UI row = one scope type + many targets. */
export type GrantFormRow = {
  scopeType?: EntitlementScopeType;
  scopeIds?: string[];
};

export function emptyGrantFormRow(): GrantFormRow {
  return { scopeType: undefined, scopeIds: [] };
}

/** Collapse API grants into one form row per scope type (multi-select friendly). */
export function collapseApiGrantsToFormRows(
  grants: ProductGrant[] | undefined | null
): GrantFormRow[] {
  if (!grants?.length) {
    return [emptyGrantFormRow()];
  }

  const byType = new Map<EntitlementScopeType, string[]>();
  for (const grant of grants) {
    if (!grant?.scopeType || !grant?.scopeId) continue;
    const existing = byType.get(grant.scopeType) ?? [];
    if (!existing.includes(grant.scopeId)) {
      existing.push(grant.scopeId);
    }
    byType.set(grant.scopeType, existing);
  }

  const rows = Array.from(byType.entries()).map(([scopeType, scopeIds]) => ({
    scopeType,
    scopeIds,
  }));

  return rows.length > 0 ? rows : [emptyGrantFormRow()];
}

/**
 * Expand form rows to API grants.
 * Deduplicates by (scopeType, scopeId) and drops empty rows.
 */
export function expandGrantFormRowsToApi(
  rows: GrantFormRow[] | undefined | null
): ProductGrant[] {
  if (!rows?.length) return [];

  const seen = new Set<string>();
  const grants: ProductGrant[] = [];

  for (const row of rows) {
    if (!row?.scopeType) continue;
    const ids = Array.isArray(row.scopeIds) ? row.scopeIds : [];
    for (const scopeId of ids) {
      if (typeof scopeId !== "string" || !scopeId.trim()) continue;
      const key = `${row.scopeType}:${scopeId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      grants.push({ scopeType: row.scopeType, scopeId });
    }
  }

  return grants;
}

/** True when the same scopeType appears on more than one row. */
export function hasDuplicateScopeTypes(rows: GrantFormRow[] | undefined | null): boolean {
  if (!rows?.length) return false;
  const seen = new Set<EntitlementScopeType>();
  for (const row of rows) {
    if (!row?.scopeType) continue;
    if (seen.has(row.scopeType)) return true;
    seen.add(row.scopeType);
  }
  return false;
}

export function usedScopeTypes(
  rows: GrantFormRow[] | undefined | null,
  exceptIndex?: number
): Set<EntitlementScopeType> {
  const used = new Set<EntitlementScopeType>();
  if (!rows) return used;
  rows.forEach((row, index) => {
    if (exceptIndex !== undefined && index === exceptIndex) return;
    if (row?.scopeType) used.add(row.scopeType);
  });
  return used;
}

/**
 * Human-readable grant labels.
 * Prefer resolved catalog/mock names; fall back to scopeType when unknown.
 */
export function listGrantLabels(
  grants: ProductGrant[] | undefined | null,
  scopeOptions: GrantScopeOptions
): string[] {
  if (!grants?.length) return [];

  return grants.map((grant) => {
    const label = scopeOptions[grant.scopeType]?.find(
      (option) => option.value === grant.scopeId
    )?.label;
    const trimmed = typeof label === "string" ? label.trim() : "";
    return trimmed || grant.scopeType;
  });
}

export function formatGrantLabels(
  grants: ProductGrant[] | undefined | null,
  scopeOptions: GrantScopeOptions
): string {
  const labels = listGrantLabels(grants, scopeOptions);
  if (!labels.length) return "-";
  return labels.join(", ");
}
