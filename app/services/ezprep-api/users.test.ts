import { beforeEach, describe, expect, it, vi } from "vitest";
import { ezPrepApiClient } from "./browser-client";
import { usersApi } from "./users";

vi.mock("./browser-client", () => ({
  ezPrepApiClient: {
    get: vi.fn(),
  },
}));

const get = vi.mocked(ezPrepApiClient.get);

describe("usersApi", () => {
  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue({ data: [], pagination: { total: 0 } });
  });

  it("calls the dedicated admin learners endpoint, never /v1/users", async () => {
    await usersApi.list({ page: 2, limit: 12, search: " anita " });

    expect(get).toHaveBeenCalledWith("/v1/admin/users", {
      searchParams: { page: 2, limit: 12, search: "anita" },
    });
    expect(get.mock.calls[0][0]).not.toBe("/v1/users");
    expect(JSON.stringify(get.mock.calls[0][1])).not.toContain("role");
    expect(JSON.stringify(get.mock.calls[0][1])).not.toContain("admin");
  });

  it("omits blank search and unused pagination keys", async () => {
    await usersApi.list({ search: "   " });
    expect(get).toHaveBeenCalledWith("/v1/admin/users", {
      searchParams: {},
    });
  });

  it("sends an empty params object when called without arguments", async () => {
    await usersApi.list();
    expect(get).toHaveBeenCalledWith("/v1/admin/users", {
      searchParams: {},
    });
  });
});
