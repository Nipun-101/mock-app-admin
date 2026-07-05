import { buildEzPrepApiUrl } from "./config";
import { EzPrepApiError, EzPrepApiRequestOptions } from "./types";

function buildUrlWithSearchParams(
  path: string,
  searchParams?: EzPrepApiRequestOptions["searchParams"]
): string {
  const url = new URL(buildEzPrepApiUrl(path));

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

function buildHeaders(
  initHeaders?: HeadersInit,
  body?: unknown
): Headers {
  const headers = new Headers(initHeaders);

  if (
    body !== undefined &&
    !(body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : null;
}

async function ezPrepApiRequest<T>(
  path: string,
  options: EzPrepApiRequestOptions = {}
): Promise<T> {
  const { body, searchParams, headers: initHeaders, ...fetchOptions } = options;

  const url = buildUrlWithSearchParams(path, searchParams);
  const headers = buildHeaders(initHeaders, body);

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });

  const data = await parseResponseBody(response);

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : `EzPrep API request failed with status ${response.status}`;

    throw new EzPrepApiError(message, response.status, path, data);
  }

  return data as T;
}

/**
 * Server-side client. Calls the EzPrep NestJS backend directly.
 * Use from API routes, server components, and server actions.
 */
export const ezPrepApiServerClient = {
  request: ezPrepApiRequest,

  get<T>(path: string, options?: EzPrepApiRequestOptions): Promise<T> {
    return ezPrepApiRequest<T>(path, { ...options, method: "GET" });
  },

  post<T>(
    path: string,
    body?: unknown,
    options?: EzPrepApiRequestOptions
  ): Promise<T> {
    return ezPrepApiRequest<T>(path, { ...options, method: "POST", body });
  },

  put<T>(
    path: string,
    body?: unknown,
    options?: EzPrepApiRequestOptions
  ): Promise<T> {
    return ezPrepApiRequest<T>(path, { ...options, method: "PUT", body });
  },

  patch<T>(
    path: string,
    body?: unknown,
    options?: EzPrepApiRequestOptions
  ): Promise<T> {
    return ezPrepApiRequest<T>(path, { ...options, method: "PATCH", body });
  },

  delete<T>(path: string, options?: EzPrepApiRequestOptions): Promise<T> {
    return ezPrepApiRequest<T>(path, { ...options, method: "DELETE" });
  },
};
