import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ezPrepApiClient } from "./browser-client";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("ezPrepApiClient", () => {
  it("calls the same-origin proxy and serializes search params", async () => {
    fetchMock.mockImplementation(() => jsonResponse({ ok: true }));

    await ezPrepApiClient.get("v1/exams", {
      searchParams: { page: 1, empty: null },
    });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url.startsWith(`${window.location.origin}/api/ezprep/v1/exams`)).toBe(
      true
    );
    expect(url).toContain("page=1");
    expect(url).not.toContain("empty");
  });

  it("reuses an in-flight GET and clears it afterwards", async () => {
    let resolveFirst: ((value: Response) => void) | undefined;
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        })
    );

    const a = ezPrepApiClient.get("/v1/exams");
    const b = ezPrepApiClient.get("/v1/exams");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFirst?.(jsonResponse({ n: 1 }));
    await expect(Promise.all([a, b])).resolves.toEqual([{ n: 1 }, { n: 1 }]);

    fetchMock.mockResolvedValue(jsonResponse({ n: 2 }));
    await expect(ezPrepApiClient.get("/v1/exams")).resolves.toEqual({ n: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not reuse POSTs", async () => {
    fetchMock.mockImplementation(() => jsonResponse({ ok: true }));
    await Promise.all([
      ezPrepApiClient.post("/v1/exams", { name: "A" }),
      ezPrepApiClient.post("/v1/exams", { name: "B" }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("put, patch, delete, and request set methods and JSON bodies", async () => {
    fetchMock.mockImplementation(() => jsonResponse({ ok: true }));
    await ezPrepApiClient.put("/v1/x", { a: 1 });
    await ezPrepApiClient.patch("/v1/x", { a: 2 });
    await ezPrepApiClient.delete("/v1/x");
    await ezPrepApiClient.request("/v1/x", { method: "POST", body: { a: 3 } });

    expect(fetchMock.mock.calls.map((call) => call[1].method)).toEqual([
      "PUT",
      "PATCH",
      "DELETE",
      "POST",
    ]);
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ a: 1 }));
    expect(fetchMock.mock.calls[0][1].headers.get("Content-Type")).toBe(
      "application/json"
    );
  });

  it("passes FormData through without forcing JSON content type", async () => {
    fetchMock.mockImplementation(() => jsonResponse({ ok: true }));
    const form = new FormData();
    form.append("file", "x");
    await ezPrepApiClient.post("/v1/files", form);
    expect(fetchMock.mock.calls[0][1].body).toBe(form);
    expect(fetchMock.mock.calls[0][1].headers.has("Content-Type")).toBe(false);
  });

  it("parses empty text as null and throws EzPrepApiError on failure", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response("", { status: 200, headers: { "content-type": "text/plain" } })
      )
      .mockImplementationOnce(() => jsonResponse({ message: "denied" }, 403));

    await expect(ezPrepApiClient.delete("/v1/empty-text")).resolves.toBeNull();
    await expect(ezPrepApiClient.delete("/v1/denied")).rejects.toMatchObject({
      name: "EzPrepApiError",
      message: "denied",
      status: 403,
    });
  });

  it("uses a status fallback when the error body has no message", async () => {
    fetchMock.mockImplementation(
      () =>
        new Response("x", { status: 502, headers: { "content-type": "text/plain" } })
    );
    await expect(ezPrepApiClient.post("/v1/bad-gateway", { a: 1 })).rejects.toMatchObject({
      message: "EzPrep API request failed with status 502",
    });
  });
});
