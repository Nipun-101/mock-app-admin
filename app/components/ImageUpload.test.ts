import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasImageUploader,
  imageFieldKey,
  registerImageUploader,
  toPlainImageMetadata,
  uploadPastedImage,
} from "./ImageUpload";

describe("toPlainImageMetadata", () => {
  it("returns undefined for values that are not image metadata", () => {
    expect(toPlainImageMetadata(null)).toBeUndefined();
    expect(toPlainImageMetadata(undefined)).toBeUndefined();
    expect(toPlainImageMetadata("key")).toBeUndefined();
    expect(toPlainImageMetadata({})).toBeUndefined();
    expect(toPlainImageMetadata({ key: "", bucket: "b" })).toBeUndefined();
    expect(toPlainImageMetadata({ key: "k", bucket: "" })).toBeUndefined();
    expect(toPlainImageMetadata({ key: 1, bucket: "b" })).toBeUndefined();
  });

  it("keeps required fields and optional scalars", () => {
    expect(
      toPlainImageMetadata({
        key: "uploads/a.png",
        bucket: "media",
        region: "ap-south-1",
        contentType: "image/png",
        size: 12,
        lastModified: "2026-01-15T00:00:00.000Z",
      })
    ).toEqual({
      key: "uploads/a.png",
      bucket: "media",
      region: "ap-south-1",
      contentType: "image/png",
      size: 12,
      lastModified: "2026-01-15T00:00:00.000Z",
    });
  });

  it("serializes Date lastModified and omits invalid optionals", () => {
    const lastModified = new Date("2026-02-01T00:00:00.000Z");

    expect(
      toPlainImageMetadata({
        key: "k",
        bucket: "b",
        region: 1,
        contentType: null,
        size: "10",
        lastModified,
      })
    ).toEqual({
      key: "k",
      bucket: "b",
      lastModified: lastModified.toISOString(),
    });
  });
});

describe("image uploader registry", () => {
  const name = ["question", "image"];

  afterEach(() => {
    registerImageUploader(name, async () => undefined)();
  });

  it("builds a stable field key", () => {
    expect(imageFieldKey(["a", 1, "b"])).toBe(JSON.stringify(["a", 1, "b"]));
  });

  it("registers, reports, and unregisters an uploader", () => {
    const upload = vi.fn().mockResolvedValue(undefined);
    expect(hasImageUploader(name)).toBe(false);

    const unregister = registerImageUploader(name, upload);
    expect(hasImageUploader(name)).toBe(true);

    unregister();
    expect(hasImageUploader(name)).toBe(false);
  });

  it("does not unregister when a newer uploader replaced the old one", () => {
    const first = vi.fn().mockResolvedValue(undefined);
    const second = vi.fn().mockResolvedValue(undefined);

    const unregisterFirst = registerImageUploader(name, first);
    registerImageUploader(name, second);
    unregisterFirst();

    expect(hasImageUploader(name)).toBe(true);
    registerImageUploader(name, second)();
    expect(hasImageUploader(name)).toBe(false);
  });
});

describe("uploadPastedImage", () => {
  const name = ["paste-target"];

  afterEach(() => {
    registerImageUploader(name, async () => undefined)();
  });

  it("returns false when no uploader is registered", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    await expect(uploadPastedImage(name, file)).resolves.toBe(false);
  });

  it("returns true when the uploader succeeds", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    const upload = vi.fn().mockResolvedValue(undefined);
    const unregister = registerImageUploader(name, upload);

    await expect(uploadPastedImage(name, file)).resolves.toBe(true);
    expect(upload).toHaveBeenCalledWith(file);
    unregister();
  });

  it("returns false when the uploader throws", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    const upload = vi.fn().mockRejectedValue(new Error("fail"));
    const unregister = registerImageUploader(name, upload);

    await expect(uploadPastedImage(name, file)).resolves.toBe(false);
    unregister();
  });
});
