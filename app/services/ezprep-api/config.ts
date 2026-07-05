const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_API_PREFIX = "/api";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function normalizePrefix(prefix: string): string {
  if (!prefix || prefix === "/") {
    return "";
  }

  const withLeadingSlash = prefix.startsWith("/") ? prefix : `/${prefix}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

function normalizePath(path: string): string {
  if (!path) {
    return "";
  }

  return path.startsWith("/") ? path : `/${path}`;
}

export interface EzPrepApiConfig {
  baseUrl: string;
  apiPrefix: string;
}

export function getEzPrepApiConfig(): EzPrepApiConfig {
  const baseUrl = trimTrailingSlash(
    process.env.EZPREP_API_URL || DEFAULT_BASE_URL
  );

  const apiPrefix = normalizePrefix(
    process.env.EZPREP_API_PREFIX || DEFAULT_API_PREFIX
  );

  return { baseUrl, apiPrefix };
}

export function buildEzPrepApiUrl(path: string): string {
  const { baseUrl, apiPrefix } = getEzPrepApiConfig();
  return `${baseUrl}${apiPrefix}${normalizePath(path)}`;
}

export const EZPREP_PROXY_PREFIX = "/api/ezprep";
