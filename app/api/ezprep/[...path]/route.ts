import { NextRequest, NextResponse } from "next/server";
import { ezPrepApiServerClient } from "@/app/services/ezprep-api/server";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";

async function readRequestBody(request: NextRequest): Promise<unknown> {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      return undefined;
    }
  }

  if (contentType.includes("multipart/form-data")) {
    return await request.formData();
  }

  const text = await request.text();
  return text.length > 0 ? text : undefined;
}

function buildForwardHeaders(
  request: NextRequest,
  body: unknown
): HeadersInit {
  const headers: Record<string, string> = {};
  const authorization = request.headers.get("authorization");

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

async function proxyToEzPrep(request: NextRequest, pathSegments: string[]) {
  const path = `/${pathSegments.join("/")}`;
  const searchParams = Object.fromEntries(
    request.nextUrl.searchParams.entries()
  );
  const body = await readRequestBody(request);

  try {
    const data = await ezPrepApiServerClient.request(path, {
      method: request.method,
      body,
      searchParams,
      headers: buildForwardHeaders(request, body),
    });

    return NextResponse.json(data);
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

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyToEzPrep(request, params.path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyToEzPrep(request, params.path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyToEzPrep(request, params.path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyToEzPrep(request, params.path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyToEzPrep(request, params.path);
}
