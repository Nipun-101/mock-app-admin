import { beforeEach, describe, expect, it, vi } from "vitest";
import { ezPrepApiClient } from "./browser-client";
import { instanceConfigApi } from "./instance-config";

vi.mock("./browser-client", () => ({
  ezPrepApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const get = vi.mocked(ezPrepApiClient.get);
const post = vi.mocked(ezPrepApiClient.post);
const put = vi.mocked(ezPrepApiClient.put);

describe("instanceConfigApi", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    put.mockReset();
  });

  it("loads the singleton configuration", async () => {
    get.mockResolvedValue({ message: "ok", data: null });
    await instanceConfigApi.get();
    expect(get).toHaveBeenCalledWith("/v1/instance-config");
  });

  it("creates the configuration", async () => {
    post.mockResolvedValue({ message: "ok", data: { name: "EZ Prep" } });
    await instanceConfigApi.create({
      name: "EZ Prep",
      logoUrl: "https://cdn.example.com/logo.png",
    });
    expect(post).toHaveBeenCalledWith("/v1/instance-config", {
      name: "EZ Prep",
      logoUrl: "https://cdn.example.com/logo.png",
    });
  });

  it("updates the configuration", async () => {
    put.mockResolvedValue({ message: "ok", data: { name: "ExamFlex" } });
    await instanceConfigApi.update({ logoUrl: null });
    expect(put).toHaveBeenCalledWith("/v1/instance-config", { logoUrl: null });
  });
});
