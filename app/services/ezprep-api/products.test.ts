import { beforeEach, describe, expect, it, vi } from "vitest";
import { ezPrepApiClient } from "./browser-client";
import { productsApi } from "./products";

vi.mock("./browser-client", () => ({
  ezPrepApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const get = vi.mocked(ezPrepApiClient.get);
const post = vi.mocked(ezPrepApiClient.post);
const patch = vi.mocked(ezPrepApiClient.patch);
const del = vi.mocked(ezPrepApiClient.delete);

describe("productsApi", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    patch.mockReset();
    del.mockReset();
  });

  it("lists products with filters", async () => {
    get.mockResolvedValue({ message: "ok", data: [] });
    await productsApi.list({ page: 2, limit: 10, status: "DRAFT", search: "ssc" });
    expect(get).toHaveBeenCalledWith("/v1/admin/products", {
      searchParams: {
        page: 2,
        limit: 10,
        status: "DRAFT",
        search: "ssc",
      },
    });
  });

  it("publishes a product", async () => {
    post.mockResolvedValue({
      message: "ok",
      data: {
        id: "p1",
        code: "SSC",
        name: "SSC",
        status: "PUBLISHED",
        version: 1,
        grants: [],
      },
    });
    await productsApi.publish("p1");
    expect(post).toHaveBeenCalledWith("/v1/admin/products/p1/publish");
  });

  it("creates a product with omitEmpty", async () => {
    post.mockResolvedValue({
      message: "ok",
      data: {
        id: "p1",
        code: "SSC",
        name: "SSC Pack",
        status: "DRAFT",
        version: 0,
        grants: [{ scopeType: "EXAM_GROUP", scopeId: "g1" }],
      },
    });
    await productsApi.create({
      code: "SSC",
      name: "SSC Pack",
      description: "",
      grants: [{ scopeType: "EXAM_GROUP", scopeId: "g1" }],
    });
    expect(post).toHaveBeenCalledWith("/v1/admin/products", {
      code: "SSC",
      name: "SSC Pack",
      grants: [{ scopeType: "EXAM_GROUP", scopeId: "g1" }],
    });
  });
});
