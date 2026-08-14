import { NextRequest, NextResponse } from "next/server";
import { ezPrepApiServerClient } from "@/app/services/ezprep-api/server";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";

const ALLOWED_V1_ROOTS = new Set([
  "categories",
  "exam-groups",
  "exams",
  "subjects",
  "topics",
  "tags",
  "questions",
  "mock-tests",
  "full-mock-tests",
  "imports",
  "files",
  "current-affairs",
]);

class InvalidJsonBodyError extends Error {
  constructor() {
    super("Invalid JSON body");
  }
}

async function readRequestBody(request: NextRequest): Promise<unknown> {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      throw new InvalidJsonBodyError();
    }
  }

  if (contentType.includes("multipart/form-data")) {
    return await request.formData();
  }

  const text = await request.text();
  return text.length > 0 ? text : undefined;
}

function resolveAdminAuthorization(request: NextRequest): string | undefined {
  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!session) {
    return undefined;
  }

  return `Bearer ${session}`;
}

function buildForwardHeaders(
  request: NextRequest,
  body: unknown
): HeadersInit {
  const headers: Record<string, string> = {};
  const authorization = resolveAdminAuthorization(request);

  if (authorization) {
    headers.Authorization = authorization;
  }

  if (!(body instanceof FormData)) {
    const contentType = request.headers.get("content-type");
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
  }

  return headers;
}

function isUnsafePathSegment(segment: string): boolean {
  if (!segment || /[\\%\0/]/.test(segment)) {
    return true;
  }

  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return true;
  }

  return (
    decoded === "." ||
    decoded === ".." ||
    decoded.includes("..") ||
    decoded.includes("/") ||
    decoded.includes("\\") ||
    decoded.includes("\0")
  );
}

async function proxyToEzPrep(request: NextRequest, pathSegments: string[]) {
  if (pathSegments.some(isUnsafePathSegment)) {
    return NextResponse.json({ message: "Invalid path" }, { status: 400 });
  }

  if (
    pathSegments[0] !== "v1" ||
    !pathSegments[1] ||
    !ALLOWED_V1_ROOTS.has(pathSegments[1])
  ) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const path = `/${pathSegments.join("/")}`;
  const searchParams = Object.fromEntries(
    request.nextUrl.searchParams.entries()
  );

  let body: unknown;
  try {
    body = await readRequestBody(request);
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
    }
    throw error;
  }

  try {
    const { data, status } = await ezPrepApiServerClient.requestWithStatus(
      path,
      {
        method: request.method,
        body,
        searchParams,
        headers: buildForwardHeaders(request, body),
      }
    );

    return NextResponse.json(data, { status });
  } catch (error) {
    if (error instanceof EzPrepApiError) {
      return NextResponse.json(
        typeof error.data === "object" && error.data !== null
          ? error.data
          : { message: error.message },
        { status: error.status }
      );
    }

    console.error("EzPrep proxy error:", error);
    return NextResponse.json(
      { message: "Failed to reach EzPrep API" },
      { status: 502 }
    );
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyToEzPrep(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyToEzPrep(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyToEzPrep(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyToEzPrep(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyToEzPrep(request, path);
}
