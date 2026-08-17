import { afterEach, describe, expect, it } from "vitest";
import { buildEzPrepApiUrl, EZPREP_PROXY_PREFIX, getEzPrepApiConfig } from "./config";

const originalUrl = process.env.EZPREP_API_URL;
const originalPrefix = process.env.EZPREP_API_PREFIX;

afterEach(() => {
  if (originalUrl === undefined) {
    delete process.env.EZPREP_API_URL;
  } else {
    process.env.EZPREP_API_URL = originalUrl;
  }
  if (originalPrefix === undefined) {
    delete process.env.EZPREP_API_PREFIX;
  } else {
    process.env.EZPREP_API_PREFIX = originalPrefix;
  }
});

describe("getEzPrepApiConfig", () => {
  it("uses localhost defaults", () => {
    delete process.env.EZPREP_API_URL;
    delete process.env.EZPREP_API_PREFIX;
    expect(getEzPrepApiConfig()).toEqual({
      baseUrl: "http://localhost:3000",
      apiPrefix: "/api",
    });
  });

  it("trims trailing slashes on the base URL and prefix", () => {
    process.env.EZPREP_API_URL = "https://api.example.com///";
    process.env.EZPREP_API_PREFIX = "/v1///";
    expect(getEzPrepApiConfig()).toEqual({
      baseUrl: "https://api.example.com",
      apiPrefix: "/v1",
    });
  });

  it("adds a leading slash to a prefix that is missing one", () => {
    process.env.EZPREP_API_PREFIX = "gateway";
    expect(getEzPrepApiConfig().apiPrefix).toBe("/gateway");
  });

  it("treats a root prefix as no prefix", () => {
    process.env.EZPREP_API_PREFIX = "/";
    expect(getEzPrepApiConfig().apiPrefix).toBe("");
  });
});

describe("buildEzPrepApiUrl", () => {
  it("joins base, prefix, and a rooted path", () => {
    delete process.env.EZPREP_API_URL;
    delete process.env.EZPREP_API_PREFIX;
    expect(buildEzPrepApiUrl("/v1/exams")).toBe(
      "http://localhost:3000/api/v1/exams"
    );
  });

  it("normalizes a path without a leading slash", () => {
    delete process.env.EZPREP_API_URL;
    delete process.env.EZPREP_API_PREFIX;
    expect(buildEzPrepApiUrl("v1/exams")).toBe(
      "http://localhost:3000/api/v1/exams"
    );
  });

  it("allows an empty path", () => {
    delete process.env.EZPREP_API_URL;
    delete process.env.EZPREP_API_PREFIX;
    expect(buildEzPrepApiUrl("")).toBe("http://localhost:3000/api");
  });
});

describe("EZPREP_PROXY_PREFIX", () => {
  it("points at the Next.js proxy", () => {
    expect(EZPREP_PROXY_PREFIX).toBe("/api/ezprep");
  });
});
