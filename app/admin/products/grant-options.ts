import {
  catalogApi,
  fetchAllPages,
  mockTestsApi,
  type EntitlementScopeType,
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

export async function loadGrantScopeOptions(): Promise<GrantScopeOptions> {
  const [examGroups, exams, mockTests] = await Promise.all([
    fetchAllPages((page, limit) =>
      catalogApi.listExamGroups({ page, limit })
    ),
    catalogApi.listAllExams(),
    fetchAllPages((page, limit) => mockTestsApi.list({ page, limit })),
  ]);

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
    MOCK_TEST: mockTests.map((mock) => ({
      value: mock.id,
      label: mock.title?.trim() || mock.id,
    })),
  };
}
