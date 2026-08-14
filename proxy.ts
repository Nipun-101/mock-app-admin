import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE = "ezprep_admin_session";

const PUBLIC_PAGES = new Set(["/login"]);
const PUBLIC_API_PREFIXES = ["/api/auth/login", "/api/auth/logout"];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function safeReturnPath(raw: string | null): string {
  if (
    !raw ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.startsWith("/login")
  ) {
    return "/admin";
  }
  return raw;
}

function decodeBase64Url(input: string): Uint8Array {
  const padded =
    input.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (input.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

async function isValidAdminSession(token: string | undefined): Promise<boolean> {
  if (!token) {
    return false;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(parts[2]) as BufferSource,
      encoder.encode(`${parts[0]}.${parts[1]}`)
    );
    if (!valid) {
      return false;
    }

    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(parts[1]))
    ) as { exp?: number; role?: string };
    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
      return false;
    }
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const authenticated = await isValidAdminSession(session);

  if (pathname.startsWith("/api")) {
    if (isPublicApi(pathname)) {
      return NextResponse.next();
    }
    if (authenticated) {
      return NextResponse.next();
    }
    return clearSessionCookie(
      NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    );
  }

  if (PUBLIC_PAGES.has(pathname)) {
    if (authenticated) {
      const dest = request.nextUrl.clone();
      dest.pathname = safeReturnPath(request.nextUrl.searchParams.get("next"));
      dest.search = "";
      return NextResponse.redirect(dest);
    }
    return NextResponse.next();
  }

  if (authenticated) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  if (pathname !== "/") {
    loginUrl.searchParams.set("next", pathname);
  }
  return clearSessionCookie(NextResponse.redirect(loginUrl));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
