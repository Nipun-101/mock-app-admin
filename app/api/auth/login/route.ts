import { NextResponse } from "next/server";
import { ezPrepApiServerClient } from "@/app/services/ezprep-api/server";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
} from "@/lib/admin-session";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Username and password are required" },
      { status: 400 }
    );
  }

  try {
    const result = await ezPrepApiServerClient.post<{
      message: string;
      data: { accessToken: string; user: { id: string; name: string; username?: string; role: string } };
    }>("/v1/auth/admin/login", body);

    const token = result.data?.accessToken;
    const role = result.data?.user?.role;
    if (!token || role !== "admin") {
      return NextResponse.json(
        { message: "Authentication failed" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      message: result.message,
      user: result.data.user,
    });
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      token,
      adminSessionCookieOptions
    );
    return response;
  } catch (error) {
    if (error instanceof EzPrepApiError) {
      return NextResponse.json(
        typeof error.data === "object" && error.data !== null
          ? error.data
          : { message: error.message },
        { status: error.status }
      );
    }

    console.error("Admin login error:", error);
    return NextResponse.json(
      { message: "Failed to reach EzPrep API" },
      { status: 502 }
    );
  }
}
