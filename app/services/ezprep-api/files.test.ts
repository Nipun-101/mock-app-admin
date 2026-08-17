import { beforeEach, describe, expect, it, vi } from "vitest";
import { ezPrepApiClient } from "./browser-client";
import { filesApi } from "./files";

vi.mock("./browser-client", () => ({
  ezPrepApiClient: {
    post: vi.fn(),
  },
}));

const post = vi.mocked(ezPrepApiClient.post);

beforeEach(() => {
  post.mockReset().mockResolvedValue({ message: "ok", data: { url: "https://cdn" } });
});

describe("filesApi", () => {
  it("uploads a file as multipart FormData", async () => {
    const file = new File(["hi"], "a.png", { type: "image/png" });
    await filesApi.upload(file);

    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe("/v1/files/upload");
    const body = post.mock.calls[0][1] as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("file")).toBe(file);
  });

  it("requests a signed URL", async () => {
    await filesApi.signedUrl("k1", "bucket-1");
    expect(post).toHaveBeenCalledWith("/v1/files/signed-url", {
      key: "k1",
      bucket: "bucket-1",
    });
  });
});
