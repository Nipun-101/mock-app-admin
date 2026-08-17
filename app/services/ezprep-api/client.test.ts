import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  delete process.env.EZPREP_API_URL;
  delete process.env.EZPREP_API_PREFIX;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function loadClient() {
  vi.resetModules();
  return import("./client");
}

function jsonResponse(body: unknown, status = 200, contentType = "application/json") {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": contentType },
  });
}

describe("ezPrepApiServerClient", () => {
  it("GETs JSON and appends search params, skipping nullish values", async () => {
    fetchMock.mockImplementation(() => jsonResponse({ ok: true }));
    const { ezPrepApiServerClient } = await loadClient();

    await expect(
      ezPrepApiServerClient.get("/v1/exams", {
        searchParams: { page: 2, q: null, skip: undefined, flag: true },
      })
    ).resolves.toEqual({ ok: true });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("http://localhost:3000/api/v1/exams");
    expect(url).toContain("page=2");
    expect(url).toContain("flag=true");
    expect(url).not.toContain("skip");
    expect(url).not.toContain("q=");
    expect(fetchMock.mock.calls[0][1].method).toBe("GET");
  });

  it("POSTs JSON with Content-Type and stringifies the body", async () => {
    fetchMock.mockImplementation(() => jsonResponse({ id: "1" }));
    const { ezPrepApiServerClient } = await loadClient();

    await ezPrepApiServerClient.post("/v1/exams", { name: "UPSC" });

    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "UPSC" }));
    expect(init.headers.get("Content-Type")).toBe("application/json");
  });

  it("leaves FormData bodies and existing Content-Type alone", async () => {
    fetchMock.mockImplementation(() => jsonResponse({ ok: true }));
    const { ezPrepApiServerClient } = await loadClient();
    const form = new FormData();
    form.append("file", "x");

    await ezPrepApiServerClient.request("/v1/files", {
      method: "POST",
      body: form,
      headers: { "Content-Type": "multipart/form-data" },
    });

    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBe(form);
    expect(init.headers.get("Content-Type")).toBe("multipart/form-data");
  });

  it("put, patch, and delete set the HTTP method", async () => {
    fetchMock.mockImplementation(() => jsonResponse({ ok: true }));
    const { ezPrepApiServerClient } = await loadClient();

    await ezPrepApiServerClient.put("/v1/x", { a: 1 });
    await ezPrepApiServerClient.patch("/v1/x", { a: 2 });
    await ezPrepApiServerClient.delete("/v1/x");

    expect(fetchMock.mock.calls.map((call) => call[1].method)).toEqual([
      "PUT",
      "PATCH",
      "DELETE",
    ]);
  });

  it("parses text bodies and null empty bodies", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response("hello", { status: 200, headers: { "content-type": "text/plain" } })
      )
      .mockResolvedValueOnce(
        new Response("", { status: 200, headers: { "content-type": "text/plain" } })
      );
    const { ezPrepApiServerClient } = await loadClient();

    await expect(ezPrepApiServerClient.get("/v1/a")).resolves.toBe("hello");
    await expect(ezPrepApiServerClient.get("/v1/b")).resolves.toBeNull();
  });

  it("throws EzPrepApiError with the API message", async () => {
    fetchMock.mockImplementation(() => jsonResponse({ message: "Nope" }, 400));
    const { ezPrepApiServerClient } = await loadClient();

    await expect(ezPrepApiServerClient.get("/v1/exams")).rejects.toMatchObject({
      name: "EzPrepApiError",
      status: 400,
      path: "/v1/exams",
      message: "Nope",
    });
  });

  it("throws a status fallback when the error body has no message", async () => {
    fetchMock.mockImplementation(() => jsonResponse({ error: true }, 503));
    const { ezPrepApiServerClient } = await loadClient();

    await expect(ezPrepApiServerClient.get("/v1/exams")).rejects.toMatchObject({
      name: "EzPrepApiError",
      message: "EzPrep API request failed with status 503",
    });
  });

  it("requestWithStatus returns data and status", async () => {
    fetchMock.mockImplementation(() => jsonResponse({ ok: true }, 201));
    const { ezPrepApiServerClient } = await loadClient();

    await expect(
      ezPrepApiServerClient.requestWithStatus("/v1/exams", { method: "POST", body: {} })
    ).resolves.toEqual({ data: { ok: true }, status: 201 });
  });

  it("requestWithStatus throws on failure using a non-object body", async () => {
    fetchMock.mockResolvedValue(
      new Response("fail", { status: 500, headers: { "content-type": "text/plain" } })
    );
    const { ezPrepApiServerClient } = await loadClient();

    await expect(
      ezPrepApiServerClient.requestWithStatus("/v1/exams")
    ).rejects.toMatchObject({
      message: "EzPrep API request failed with status 500",
      status: 500,
    });
  });
});
