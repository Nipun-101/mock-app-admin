import { beforeEach, describe, expect, it, vi } from "vitest";
import { ezPrepApiClient } from "./browser-client";
import { adminDashboardApi } from "./admin-dashboard";

vi.mock("./browser-client", () => ({
  ezPrepApiClient: {
    get: vi.fn(),
  },
}));

const get = vi.mocked(ezPrepApiClient.get);

beforeEach(() => {
  get.mockReset().mockResolvedValue({ message: "ok", data: {} });
});

describe("adminDashboardApi", () => {
  it("hits every dashboard endpoint under /v1/admin/dashboard", async () => {
    await adminDashboardApi.getSummary();
    await adminDashboardApi.getUsers();
    await adminDashboardApi.getQuestions();
    await adminDashboardApi.getFailedQuestions();
    await adminDashboardApi.getMockTests();
    await adminDashboardApi.getFullMockTests();
    await adminDashboardApi.getAttempts();
    await adminDashboardApi.getExams();
    await adminDashboardApi.getSubjects();
    await adminDashboardApi.getTopics();
    await adminDashboardApi.getTags();

    expect(get.mock.calls.map((call) => call[0])).toEqual([
      "/v1/admin/dashboard",
      "/v1/admin/dashboard/users",
      "/v1/admin/dashboard/questions",
      "/v1/admin/dashboard/failed-questions",
      "/v1/admin/dashboard/mock-tests",
      "/v1/admin/dashboard/full-mock-tests",
      "/v1/admin/dashboard/attempts",
      "/v1/admin/dashboard/exams",
      "/v1/admin/dashboard/subjects",
      "/v1/admin/dashboard/topics",
      "/v1/admin/dashboard/tags",
    ]);
  });
});
