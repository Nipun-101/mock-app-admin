import {
  catalogApi,
  fetchAllPages,
  mockTestsApi,
  type EntitlementScopeType,
} from "@/app/services/ezprep-api";
import { fullMockApi } from "../full-mock-tests/api";
import { sprintTestsApi } from "../sprint-tests/api";

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

function paperLabel(kind: "Topic" | "Sprint" | "Full", title?: string | null, id?: string) {
  const name = title?.trim() || id || "Untitled";
  return `${kind} · ${name}`;
}

/**
 * Loads scope pickers for product grants and admin entitlements.
 *
 * MOCK_TEST merges topic-wise + sprint + full-exam published papers (they live on
 * separate list endpoints). Options are prefetched via paginated list APIs
 * (fetchAllPages, max 50 pages × 100) and filtered client-side in SearchableSelect.
 */
export async function loadGrantScopeOptions(): Promise<GrantScopeOptions> {
  const [examGroups, exams, topicWise, sprints, fullMocks] = await Promise.all([
    fetchAllPages((page, limit) =>
      catalogApi.listExamGroups({ page, limit })
    ),
    catalogApi.listAllExams(),
    fetchAllPages((page, limit) => mockTestsApi.list({ page, limit })),
    fetchAllPages((page, limit) =>
      sprintTestsApi.listPublished({ page, limit })
    ),
    fetchAllPages((page, limit) =>
      fullMockApi.listPublished({ page, limit })
    ),
  ]);

  const mockTestOptions: ScopeOption[] = [
    ...topicWise.map((mock) => ({
      value: mock.id,
      label: paperLabel("Topic", mock.title, mock.id),
    })),
    ...sprints.map((mock) => ({
      value: mock.id,
      label: paperLabel("Sprint", mock.title, mock.id),
    })),
    ...fullMocks.map((mock) => ({
      value: mock.id,
      label: paperLabel("Full", mock.title, mock.id),
    })),
  ].sort((a, b) => a.label.localeCompare(b.label));

  return {
    EXAM_GROUP: examGroups.map((group) => ({
      value: group.id,
      label: group.shortName
        ? `${group.name} (${group.shortName})`
        : group.name,
    })),
    EXAM: exams.map((exam) => ({
      value: exam.id,
      label: exam.name,
    })),
    MOCK_TEST: mockTestOptions,
  };
}
