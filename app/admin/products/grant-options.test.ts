import { beforeEach, describe, expect, it, vi } from "vitest";
import { grantTargetsApi } from "@/app/services/ezprep-api";
import { resolveGrantTargetLabels } from "./grant-options";

vi.mock("@/app/services/ezprep-api", () => ({
  grantTargetsApi: {
    search: vi.fn(),
  },
}));

const search = vi.mocked(grantTargetsApi.search);

function response(data: { id: string; label: string }[]) {
  return {
    message: "ok",
    data,
    pagination: {
      total: data.length,
      page: 1,
      limit: 100,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  };
}

describe("resolveGrantTargetLabels", () => {
  beforeEach(() => {
    search.mockReset();
  });

  it("requests one lookup per scope type and keeps returned labels", async () => {
    search.mockImplementation(async (params) => {
      if (params.scopeType === "EXAM_GROUP") {
        return response([{ id: "g1", label: "SSC Group" }]);
      }
      if (params.scopeType === "MOCK_TEST") {
        return response([{ id: "m1", label: "Topic · Polity" }]);
      }
      return response([]);
    });

    const options = await resolveGrantTargetLabels([
      { scopeType: "EXAM_GROUP", scopeId: "g1" },
      { scopeType: "EXAM_GROUP", scopeId: "g1" },
      { scopeType: "MOCK_TEST", scopeId: "m1" },
      { scopeType: "EXAM", scopeId: "missing" },
    ]);

    expect(options.EXAM_GROUP).toEqual([{ value: "g1", label: "SSC Group" }]);
    expect(options.MOCK_TEST).toEqual([
      { value: "m1", label: "Topic · Polity" },
    ]);
    expect(options.EXAM).toEqual([]);
    expect(search).toHaveBeenCalledTimes(3);
    expect(search).toHaveBeenCalledWith({
      scopeType: "EXAM_GROUP",
      ids: "g1",
    });
  });

  it("chunks id lookups at 100", async () => {
    search.mockResolvedValue(response([]));
    const ids = Array.from({ length: 101 }, (_, index) => `e${index}`);

    await resolveGrantTargetLabels(
      ids.map((scopeId) => ({ scopeType: "EXAM" as const, scopeId }))
    );

    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[0][0].ids?.split(",")).toHaveLength(100);
    expect(search.mock.calls[1][0].ids?.split(",")).toHaveLength(1);
  });
});
