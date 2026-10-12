import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  listExamGroups,
  listAllExams,
  listMockTests,
  listSprints,
  listFullMocks,
  fetchAllPages,
} = vi.hoisted(() => ({
  listExamGroups: vi.fn(),
  listAllExams: vi.fn(),
  listMockTests: vi.fn(),
  listSprints: vi.fn(),
  listFullMocks: vi.fn(),
  fetchAllPages: vi.fn(
    async (fetchPage: (page: number, limit: number) => Promise<{ data: unknown[] }>) => {
      const first = await fetchPage(1, 100);
      return first.data ?? [];
    }
  ),
}));

vi.mock("@/app/services/ezprep-api", () => ({
  catalogApi: {
    listExamGroups,
    listAllExams,
  },
  mockTestsApi: {
    list: listMockTests,
  },
  fetchAllPages,
}));

vi.mock("../sprint-tests/api", () => ({
  sprintTestsApi: {
    listPublished: listSprints,
  },
}));

vi.mock("../full-mock-tests/api", () => ({
  fullMockApi: {
    listPublished: listFullMocks,
  },
}));

import { loadGrantScopeOptions } from "./grant-options";

describe("loadGrantScopeOptions", () => {
  beforeEach(() => {
    listExamGroups.mockReset();
    listAllExams.mockReset();
    listMockTests.mockReset();
    listSprints.mockReset();
    listFullMocks.mockReset();
    fetchAllPages.mockClear();

    listAllExams.mockResolvedValue([{ id: "e1", name: "SSC CGL" }]);
    listExamGroups.mockResolvedValue({
      data: [{ id: "g1", name: "SSC", shortName: "SSC" }],
    });
    listMockTests.mockResolvedValue({
      data: [{ id: "t1", title: "Polity set" }],
    });
    listSprints.mockResolvedValue({
      data: [{ id: "s1", title: "Quick sprint" }],
    });
    listFullMocks.mockResolvedValue({
      data: [{ id: "f1", title: "Full prelims" }],
    });
  });

  it("merges topic-wise, sprint, and full-mock papers into MOCK_TEST options", async () => {
    const options = await loadGrantScopeOptions();

    expect(options.MOCK_TEST).toEqual(
      expect.arrayContaining([
        { value: "t1", label: "Topic · Polity set" },
        { value: "s1", label: "Sprint · Quick sprint" },
        { value: "f1", label: "Full · Full prelims" },
      ])
    );
    expect(options.MOCK_TEST).toHaveLength(3);
    expect(listSprints).toHaveBeenCalled();
    expect(listFullMocks).toHaveBeenCalled();
    expect(listMockTests).toHaveBeenCalled();
  });
});
