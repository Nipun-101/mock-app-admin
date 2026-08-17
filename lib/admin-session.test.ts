import { afterEach, describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  adminSessionCookieOptions,
} from "./admin-session";

describe("admin session cookie", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("exports a 30-day httpOnly cookie named ezprep_admin_session", () => {
    expect(ADMIN_SESSION_COOKIE).toBe("ezprep_admin_session");
    expect(ADMIN_SESSION_MAX_AGE).toBe(60 * 60 * 24 * 30);
    expect(adminSessionCookieOptions).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE,
    });
  });

  it("is secure only in production", () => {
    expect(typeof adminSessionCookieOptions.secure).toBe("boolean");
  });
});
