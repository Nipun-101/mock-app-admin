import { EZPREP_PROXY_PREFIX } from "./config";
import { EzPrepApiError, EzPrepApiRequestOptions } from "./types";

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function buildProxyUrl(
  path: string,
  searchParams?: EzPrepApiRequestOptions["searchParams"]
): string {
  const url = new URL(`${EZPREP_PROXY_PREFIX}${normalizePath(path)}`, window.location.origin);

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

const inFlightGets = new Map<string, Promise<unknown>>();

async function ezPrepBrowserRequest<T>(
  path: string,
  options: EzPrepApiRequestOptions = {}
): Promise<T> {
  const { body, searchParams, headers: initHeaders, ...fetchOptions } = options;

  const url = buildProxyUrl(path, searchParams);
  const method = (fetchOptions.method || "GET").toUpperCase();
  const canReuseInFlight = method === "GET" && body === undefined;

  if (canReuseInFlight) {
    const existing = inFlightGets.get(url);
    if (existing) {
      return existing as Promise<T>;
    }
  }

  const headers = buildHeaders(initHeaders, body);
  const request = (async () => {
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
  })();

  if (canReuseInFlight) {
    inFlightGets.set(url, request);
    void request.finally(() => {
      if (inFlightGets.get(url) === request) {
        inFlightGets.delete(url);
      }
    });
  }

  return request;
}

/**
 * Browser client. Calls this Next.js app's /api/ezprep proxy, which forwards
 * to the EzPrep backend server-side. Avoids CORS entirely.
 */
export const ezPrepApiClient = {
  request: ezPrepBrowserRequest,

  get<T>(path: string, options?: EzPrepApiRequestOptions): Promise<T> {
    return ezPrepBrowserRequest<T>(path, { ...options, method: "GET" });
  },

  post<T>(
    path: string,
    body?: unknown,
    options?: EzPrepApiRequestOptions
  ): Promise<T> {
    return ezPrepBrowserRequest<T>(path, { ...options, method: "POST", body });
  },

  put<T>(
    path: string,
    body?: unknown,
    options?: EzPrepApiRequestOptions
  ): Promise<T> {
    return ezPrepBrowserRequest<T>(path, { ...options, method: "PUT", body });
  },

  patch<T>(
    path: string,
    body?: unknown,
    options?: EzPrepApiRequestOptions
  ): Promise<T> {
    return ezPrepBrowserRequest<T>(path, { ...options, method: "PATCH", body });
  },

  delete<T>(path: string, options?: EzPrepApiRequestOptions): Promise<T> {
    return ezPrepBrowserRequest<T>(path, { ...options, method: "DELETE" });
  },
};
