import { afterEach, describe, expect, it } from "vitest";
import type { InstanceConfig } from "@/app/services/ezprep-api/instance-config";
import {
  applyInstanceDocumentBranding,
  toInstanceBranding,
} from "./instance-branding";

function config(overrides: Partial<InstanceConfig> = {}): InstanceConfig {
  return {
    id: "singleton",
    schemaVersion: 1,
    name: "EZ Prep",
    logoUrl: "https://cdn.example.com/logo.png",
    faviconUrl: "https://cdn.example.com/favicon.ico",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("toInstanceBranding", () => {
  it("returns null until a name has been saved", () => {
    expect(toInstanceBranding(null)).toBeNull();
    expect(toInstanceBranding(undefined)).toBeNull();
    expect(toInstanceBranding(config({ name: "   " }))).toBeNull();
  });

  it("keeps http and https assets and drops anything else", () => {
    expect(toInstanceBranding(config())).toEqual({
      name: "EZ Prep",
      logoUrl: "https://cdn.example.com/logo.png",
      faviconUrl: "https://cdn.example.com/favicon.ico",
    });

    expect(
      toInstanceBranding(
        config({
          name: " ExamFlex ",
          logoUrl: "javascript:alert(1)",
          faviconUrl: "/relative.png",
        })
      )
    ).toEqual({
      name: "ExamFlex",
      logoUrl: null,
      faviconUrl: null,
    });
  });
});

describe("applyInstanceDocumentBranding", () => {
  afterEach(() => {
    document.title = "";
    document.getElementById("instance-favicon")?.remove();
  });

  it("sets the title and favicon, then restores them", () => {
    document.title = "Mock Test Admin";
    const restore = applyInstanceDocumentBranding({
      name: "ExamFlex",
      logoUrl: null,
      faviconUrl: "https://cdn.example.com/favicon.ico",
    });

    expect(document.title).toBe("ExamFlex");
    expect(document.getElementById("instance-favicon")).toHaveAttribute(
      "href",
      "https://cdn.example.com/favicon.ico"
    );

    restore();

    expect(document.title).toBe("Mock Test Admin");
    expect(document.getElementById("instance-favicon")).toBeNull();
  });

  it("leaves the title alone and removes a previous favicon when nothing is configured", () => {
    document.title = "Mock Test Admin";
    const link = document.createElement("link");
    link.id = "instance-favicon";
    document.head.appendChild(link);

    const restore = applyInstanceDocumentBranding(null);

    expect(document.title).toBe("Mock Test Admin");
    expect(document.getElementById("instance-favicon")).toBeNull();
    restore();
  });
});
