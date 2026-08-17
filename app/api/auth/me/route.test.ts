import { beforeEach, describe, expect, it, vi } from "vitest";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";

const cookieGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieGet })),
}));

vi.mock("@/app/services/ezprep-api/server", () => ({
  ezPrepApiServerClient: {
    get: vi.fn(),
  },
}));

import { ezPrepApiServerClient } from "@/app/services/ezprep-api/server";
import { GET } from "./route";

const get = vi.mocked(ezPrepApiServerClient.get);

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    cookieGet.mockReset();
    get.mockReset();
  });

  it("returns 401 when there is no session cookie", async () => {
    cookieGet.mockReturnValue(undefined);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(get).not.toHaveBeenCalled();
  });

  it("returns the profile for an admin", async () => {
    cookieGet.mockReturnValue({ value: "tok" });
    get.mockResolvedValue({
      message: "ok",
      data: { id: "1", name: "Root", role: "admin" },
    });

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "ok",
      data: { id: "1", name: "Root", role: "admin" },
    });
    expect(get).toHaveBeenCalledWith("/v1/auth/profile", {
      headers: { Authorization: "Bearer tok" },
    });
  });

  it("clears the cookie for a non-admin profile", async () => {
    cookieGet.mockReturnValue({ value: "tok" });
    get.mockResolvedValue({
      message: "ok",
      data: { id: "2", name: "Student", role: "user" },
    });

    const response = await GET();
    expect(response.status).toBe(403);
    expect(response.cookies.get("ezprep_admin_session")?.value).toBe("");
  });

  it("clears the cookie on 401 from the API", async () => {
    cookieGet.mockReturnValue({ value: "tok" });
    get.mockRejectedValue(new EzPrepApiError("nope", 401, "/v1/auth/profile", null));

    const response = await GET();
    expect(response.status).toBe(401);
    expect(response.cookies.get("ezprep_admin_session")?.value).toBe("");
  });

  it("returns 502 without clearing the cookie when the API is down", async () => {
    cookieGet.mockReturnValue({ value: "tok" });
    get.mockRejectedValue(new Error("offline"));

    const response = await GET();
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      message: "Failed to reach EzPrep API",
    });
    expect(response.cookies.get("ezprep_admin_session")).toBeUndefined();
  });
});
