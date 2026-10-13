import {
  grantTargetsApi,
  type EntitlementScopeType,
  type ProductGrant,
} from "@/app/services/ezprep-api";

export type ScopeOption = { value: string; label: string };

export type GrantScopeOptions = Record<EntitlementScopeType, ScopeOption[]>;

export const SCOPE_TYPE_OPTIONS: { value: EntitlementScopeType; label: string }[] =
  [
    { value: "EXAM_GROUP", label: "Exam Group" },
    { value: "EXAM", label: "Exam" },
    { value: "MOCK_TEST", label: "Mock Test" },
  ];

export const EMPTY_GRANT_SCOPE_OPTIONS: GrantScopeOptions = {
  EXAM_GROUP: [],
  EXAM: [],
  MOCK_TEST: [],
};

const IDS_PER_REQUEST = 100;

/**
 * Resolves labels for grants already on screen.
 * One request per scope type, in chunks of 100 ids. Unknown ids are omitted
 * so callers can fall back to the scope type.
 */
export async function resolveGrantTargetLabels(
  grants: Array<Pick<ProductGrant, "scopeType" | "scopeId"> | null | undefined>
): Promise<GrantScopeOptions> {
  const idsByType: GrantScopeOptions = {
    EXAM_GROUP: [],
    EXAM: [],
    MOCK_TEST: [],
  };
  const seen = new Set<string>();

  for (const grant of grants) {
    if (!grant?.scopeType || !grant.scopeId) continue;
    const key = `${grant.scopeType}:${grant.scopeId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    idsByType[grant.scopeType].push({
      value: grant.scopeId,
      label: grant.scopeId,
    });
  }

  const options: GrantScopeOptions = {
    EXAM_GROUP: [],
    EXAM: [],
    MOCK_TEST: [],
  };

  await Promise.all(
    (Object.keys(idsByType) as EntitlementScopeType[]).map(async (scopeType) => {
      const ids = idsByType[scopeType].map((option) => option.value);
      if (ids.length === 0) return;

      const labels: ScopeOption[] = [];
      for (let index = 0; index < ids.length; index += IDS_PER_REQUEST) {
        const chunk = ids.slice(index, index + IDS_PER_REQUEST);
        const response = await grantTargetsApi.search({
          scopeType,
          ids: chunk.join(","),
        });
        for (const row of response.data ?? []) {
          labels.push({ value: row.id, label: row.label });
        }
      }
      options[scopeType] = labels;
    })
  );

  return options;
}
