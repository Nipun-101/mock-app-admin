import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, proxy } from "./proxy";

const SECRET = "test-jwt-secret";

function toBase64Url(bytes: Uint8Array | string): string {
  const binary =
    typeof bytes === "string"
      ? bytes
      : String.fromCharCode(...bytes);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function signJwt(payload: Record<string, unknown>, secret = SECRET) {
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = toBase64Url(JSON.stringify(payload));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${header}.${body}`)
  );
  return `${header}.${body}.${toBase64Url(new Uint8Array(signature))}`;
}

function request(path: string, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: cookie ? { cookie: `ezprep_admin_session=${cookie}` } : undefined,
  });
}

describe("proxy", () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  it("exports a matcher that skips static assets", () => {
    expect(config.matcher[0]).toContain("_next/static");
  });

  it("allows public auth APIs without a session", async () => {
    const response = await proxy(request("/api/auth/login"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("rejects other APIs without a valid admin session", async () => {
    const response = await proxy(request("/api/ezprep/v1/exams"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "Unauthorized" });
  });

  it("lets authenticated APIs through", async () => {
    const token = await signJwt({
      role: "admin",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const response = await proxy(request("/api/ezprep/v1/exams", token));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects authenticated users away from /login using a safe next path", async () => {
    const token = await signJwt({
      role: "admin",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const response = await proxy(request("/login?next=/admin/users", token));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/admin/users");
  });

  it("ignores unsafe next paths when redirecting from /login", async () => {
    const token = await signJwt({
      role: "admin",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const response = await proxy(request("/login?next=//evil.example", token));
    expect(response.headers.get("location")).toBe("http://localhost/admin");
  });

  it("lets anonymous users stay on /login", async () => {
    const response = await proxy(request("/login"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects anonymous page visits to /login with a next param", async () => {
    const response = await proxy(request("/admin/users"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fadmin%2Fusers"
    );
  });

  it("does not add next when redirecting from /", async () => {
    const response = await proxy(request("/"));
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("treats missing JWT_SECRET, malformed tokens, bad signatures, expiry, and non-admin roles as unauthenticated", async () => {
    delete process.env.JWT_SECRET;
    expect((await proxy(request("/admin", "anything"))).status).toBe(307);

    process.env.JWT_SECRET = SECRET;
    expect((await proxy(request("/admin", "not-a-jwt"))).status).toBe(307);

    const badSig = await signJwt(
      { role: "admin", exp: Math.floor(Date.now() / 1000) + 3600 },
      "other-secret"
    );
    expect((await proxy(request("/admin", badSig))).status).toBe(307);

    const expired = await signJwt({
      role: "admin",
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    expect((await proxy(request("/admin", expired))).status).toBe(307);

    const user = await signJwt({
      role: "user",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    expect((await proxy(request("/admin", user))).status).toBe(307);
  });

  it("lets authenticated users through to admin pages", async () => {
    const token = await signJwt({
      role: "admin",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const response = await proxy(request("/admin", token));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
