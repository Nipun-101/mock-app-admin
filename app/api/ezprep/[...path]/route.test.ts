import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";

vi.mock("@/app/services/ezprep-api/server", () => ({
  ezPrepApiServerClient: {
    requestWithStatus: vi.fn(),
  },
}));

import { ezPrepApiServerClient } from "@/app/services/ezprep-api/server";
import { DELETE, GET, PATCH, POST, PUT } from "./route";

const requestWithStatus = vi.mocked(ezPrepApiServerClient.requestWithStatus);

function makeRequest(
  url: string,
  init?: RequestInit & { cookies?: Record<string, string> }
) {
  const headers = new Headers(init?.headers);
  if (init?.cookies) {
    headers.set(
      "cookie",
      Object.entries(init.cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join("; ")
    );
  }
  return new NextRequest(url, { ...init, headers });
}

const ctx = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe("EzPrep proxy route", () => {
  beforeEach(() => {
    requestWithStatus.mockReset();
    requestWithStatus.mockResolvedValue({ data: { ok: true }, status: 200 });
  });

  it("rejects unsafe path segments", async () => {
    const response = await GET(makeRequest("http://localhost/api/ezprep/v1/../x"), ctx(["v1", ".."]));
    expect(response.status).toBe(400);
    expect(requestWithStatus).not.toHaveBeenCalled();
  });

  it("rejects unknown v1 roots", async () => {
    const response = await GET(
      makeRequest("http://localhost/api/ezprep/v1/secret"),
      ctx(["v1", "secret"])
    );
    expect(response.status).toBe(404);
  });

  it("forwards GET search params and the session bearer token", async () => {
    const response = await GET(
      makeRequest("http://localhost/api/ezprep/v1/exams?page=2", {
        cookies: { ezprep_admin_session: "tok" },
      }),
      ctx(["v1", "exams"])
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(requestWithStatus).toHaveBeenCalledWith("/v1/exams", {
      method: "GET",
      body: undefined,
      searchParams: { page: "2" },
      headers: { Authorization: "Bearer tok" },
    });
  });

  it("forwards JSON POST bodies and content-type", async () => {
    await POST(
      makeRequest("http://localhost/api/ezprep/v1/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Govt" }),
        cookies: { ezprep_admin_session: "tok" },
      }),
      ctx(["v1", "categories"])
    );

    expect(requestWithStatus).toHaveBeenCalledWith("/v1/categories", {
      method: "POST",
      body: { name: "Govt" },
      searchParams: {},
      headers: {
        Authorization: "Bearer tok",
        "Content-Type": "application/json",
      },
    });
  });

  it("rejects invalid JSON bodies", async () => {
    const response = await POST(
      makeRequest("http://localhost/api/ezprep/v1/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
      ctx(["v1", "categories"])
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: "Invalid JSON body" });
  });

  it("forwards multipart FormData bodies", async () => {
    const form = new FormData();
    form.append("file", "x");
    await POST(
      makeRequest("http://localhost/api/ezprep/v1/files", {
        method: "POST",
        body: form,
      }),
      ctx(["v1", "files"])
    );
    const options = requestWithStatus.mock.calls[0][1];
    expect(typeof (options.body as FormData).get).toBe("function");
    expect((options.body as FormData).get("file")).toBe("x");
    expect(options.headers).not.toHaveProperty("Authorization");
  });

  it("forwards raw text bodies", async () => {
    await PUT(
      makeRequest("http://localhost/api/ezprep/v1/questions/1", {
        method: "PUT",
        headers: { "content-type": "text/plain" },
        body: "hello",
      }),
      ctx(["v1", "questions", "1"])
    );
    expect(requestWithStatus.mock.calls[0][1].body).toBe("hello");
  });

  it("exports PATCH and DELETE", async () => {
    await PATCH(
      makeRequest("http://localhost/api/ezprep/v1/topics/1", { method: "PATCH" }),
      ctx(["v1", "topics", "1"])
    );
    await DELETE(
      makeRequest("http://localhost/api/ezprep/v1/topics/1", { method: "DELETE" }),
      ctx(["v1", "topics", "1"])
    );
    expect(requestWithStatus).toHaveBeenCalledTimes(2);
  });

  it("forwards EzPrepApiError payloads", async () => {
    requestWithStatus.mockRejectedValue(
      new EzPrepApiError("nope", 409, "/v1/exams", { message: "conflict" })
    );
    const response = await GET(
      makeRequest("http://localhost/api/ezprep/v1/exams"),
      ctx(["v1", "exams"])
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ message: "conflict" });
  });

  it("returns 502 when the backend is unreachable", async () => {
    requestWithStatus.mockRejectedValue(new Error("offline"));
    const response = await GET(
      makeRequest("http://localhost/api/ezprep/v1/exams"),
      ctx(["v1", "exams"])
    );
    expect(response.status).toBe(502);
  });

  it("rejects encoded traversal and empty segments", async () => {
    expect(
      (await GET(makeRequest("http://localhost/api/ezprep/v1/%2e%2e"), ctx(["v1", "%2e%2e"])))
        .status
    ).toBe(400);
    expect(
      (await GET(makeRequest("http://localhost/api/ezprep/v1/%"), ctx(["v1", "%"]))).status
    ).toBe(400);
    expect(
      (await GET(makeRequest("http://localhost/api/ezprep/v1/"), ctx(["v1", ""]))).status
    ).toBe(400);
  });
});
