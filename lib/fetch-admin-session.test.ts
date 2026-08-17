import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminSession } from "./fetch-admin-session";

describe("fetchAdminSession", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reuses an in-flight /api/auth/me request", async () => {
    let resolveFirst: ((value: Response) => void) | undefined;
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        })
    );

    const a = fetchAdminSession();
    const b = fetchAdminSession();
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/me");

    resolveFirst?.(new Response(null, { status: 200 }));
    await Promise.all([a, b]);

    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await fetchAdminSession();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
