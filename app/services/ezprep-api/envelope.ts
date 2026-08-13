import { EzPrepApiError } from "./types";

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface ApiListResponse<T> {
  message: string;
  data: T[];
  pagination?: PaginationMeta;
  count?: number;
}

export interface ApiItemResponse<T> {
  message: string;
  data: T;
}

export interface ApiMessageResponse {
  message: string;
}

export function formatEzPrepError(error: unknown, fallback: string): string {
  if (!(error instanceof EzPrepApiError)) {
    return fallback;
  }

  if (error.status === 401 || error.status === 403) {
    return "Session expired or you are not signed in. Please sign in again.";
  }

  const data =
    error.data && typeof error.data === "object"
      ? (error.data as Record<string, unknown>)
      : null;

  const rawMessage = data?.message;
  const message =
    typeof rawMessage === "string"
      ? rawMessage
      : Array.isArray(rawMessage)
        ? rawMessage.join(", ")
        : error.message;

  const code = data?.error ?? data?.code;
  const parts = [message];
  if (typeof code === "string") {
    parts.push(`(${code})`);
  }

  const details = data?.details;
  if (Array.isArray(details)) {
    const extra = details
      .map((item) => {
        if (!item || typeof item !== "object") return JSON.stringify(item);
        const row = item as Record<string, unknown>;
        if (Array.isArray(row.displayPositions)) {
          return `positions ${row.displayPositions.join(", ")}`;
        }
        if (typeof row.rule === "string") {
          if (row.expected != null) {
            return `${row.rule}: expected ${row.expected}, got ${row.actual}`;
          }
          return row.rule;
        }
        return JSON.stringify(item);
      })
      .join("; ");
    if (extra) parts.push(extra);
  } else if (details && typeof details === "object") {
    const row = details as Record<string, unknown>;
    if (row.subjectName) {
      parts.push(
        `${row.subjectName}: need ${row.needed}, available ${row.available}`
      );
    }
    if (typeof row.existingPosition === "number") {
      parts.push(`already used at position ${row.existingPosition + 1}`);
    }
    if (typeof row.expected === "number" && typeof row.actual === "number") {
      parts.push(`expected ${row.expected}, got ${row.actual}`);
    }
    if (typeof row.difficulty === "string") {
      parts.push(
        `${row.difficulty}: found ${row.availableQuestions ?? row.available}, need ${row.needed ?? row.count}`
      );
    }
  }

  return parts.join(" — ");
}

export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<ApiListResponse<T>>,
  limit = 100
): Promise<T[]> {
  const first = await fetchPage(1, limit);
  const items = [...(first.data || [])];
  const totalPages = Math.min(first.pagination?.totalPages ?? 1, 50);

  for (let page = 2; page <= totalPages; page++) {
    const next = await fetchPage(page, limit);
    items.push(...(next.data || []));
  }

  return items;
}

export function omitEmpty<T extends Record<string, unknown>>(payload: T): T {
  const next = { ...payload };
  for (const key of Object.keys(next)) {
    const value = next[key];
    if (value === "" || value === undefined || value === null) {
      delete next[key];
    }
  }
  return next;
}

export function omitUndefined<T extends Record<string, unknown>>(payload: T): T {
  const next = { ...payload };
  for (const key of Object.keys(next)) {
    if (next[key] === undefined) {
      delete next[key];
    }
  }
  return next;
}
