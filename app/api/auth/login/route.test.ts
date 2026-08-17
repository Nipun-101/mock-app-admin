import { beforeEach, describe, expect, it, vi } from "vitest";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";

vi.mock("@/app/services/ezprep-api/server", () => ({
  ezPrepApiServerClient: {
    post: vi.fn(),
  },
}));

import { ezPrepApiServerClient } from "@/app/services/ezprep-api/server";
import { POST } from "./route";

const post = vi.mocked(ezPrepApiServerClient.post);

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    post.mockReset();
  });

  it("rejects invalid JSON", async () => {
    const response = await POST(jsonRequest("{"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Username and password are required",
    });
  });

  it("sets the session cookie for an admin token", async () => {
    post.mockResolvedValue({
      message: "ok",
      data: {
        accessToken: "tok",
        user: { id: "1", name: "Root", role: "admin" },
      },
    });

    const response = await POST(jsonRequest({ username: "root", password: "x" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "ok",
      user: { id: "1", name: "Root", role: "admin" },
    });
    const cookie = response.cookies.get("ezprep_admin_session");
    expect(cookie?.value).toBe("tok");
  });

  it("rejects a missing token or non-admin role", async () => {
    post.mockResolvedValueOnce({
      message: "ok",
      data: { accessToken: "", user: { id: "1", name: "Root", role: "admin" } },
    });
    expect((await POST(jsonRequest({}))).status).toBe(401);

    post.mockResolvedValueOnce({
      message: "ok",
      data: {
        accessToken: "tok",
        user: { id: "1", name: "Student", role: "user" },
      },
    });
    expect((await POST(jsonRequest({}))).status).toBe(401);
  });

  it("forwards EzPrepApiError payloads", async () => {
    post.mockRejectedValue(
      new EzPrepApiError("bad", 401, "/v1/auth/admin/login", { message: "Invalid" })
    );
    const response = await POST(jsonRequest({ username: "a", password: "b" }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "Invalid" });
  });

  it("uses the error message when EzPrepApiError data is not an object", async () => {
    post.mockRejectedValue(new EzPrepApiError("plain", 400, "/p", "nope"));
    const response = await POST(jsonRequest({}));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: "plain" });
  });

  it("returns 502 when the API is unreachable", async () => {
    post.mockRejectedValue(new Error("offline"));
    const response = await POST(jsonRequest({}));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      message: "Failed to reach EzPrep API",
    });
  });
});
