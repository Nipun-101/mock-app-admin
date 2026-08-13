export const ADMIN_SESSION_COOKIE = "ezprep_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export const adminSessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ADMIN_SESSION_MAX_AGE,
};
