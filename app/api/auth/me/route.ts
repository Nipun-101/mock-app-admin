import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ezPrepApiServerClient } from "@/app/services/ezprep-api/server";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
} from "@/lib/admin-session";

export async function GET() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await ezPrepApiServerClient.get<{
      message: string;
      data: { id: string; name: string; username?: string; role: string };
    }>("/v1/auth/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (result.data?.role !== "admin") {
      const response = NextResponse.json(
        { message: "Admin access required" },
        { status: 403 }
      );
      response.cookies.set(ADMIN_SESSION_COOKIE, "", {
        ...adminSessionCookieOptions,
        maxAge: 0,
      });
      return response;
    }

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof EzPrepApiError ? error.status : 502;
    const response = NextResponse.json(
      { message: status === 502 ? "Failed to reach EzPrep API" : "Unauthorized" },
      { status: status === 502 ? 502 : status },
    );
    if (status === 401 || status === 403) {
      response.cookies.set(ADMIN_SESSION_COOKIE, "", {
        ...adminSessionCookieOptions,
        maxAge: 0,
      });
    }
    return response;
  }
}
