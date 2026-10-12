import { beforeEach, describe, expect, it, vi } from "vitest";
import { ezPrepApiClient } from "./browser-client";
import { offersApi } from "./offers";

vi.mock("./browser-client", () => ({
  ezPrepApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const post = vi.mocked(ezPrepApiClient.post);
const patch = vi.mocked(ezPrepApiClient.patch);

describe("offersApi", () => {
  beforeEach(() => {
    post.mockReset();
    patch.mockReset();
  });

  it("creates an offer under a product with duration and paise amounts", async () => {
    post.mockResolvedValue({
      message: "ok",
      data: {
        id: "o1",
        productId: "p1",
        durationPreset: "3M",
        currency: "INR",
        listAmount: 99900,
        taxIncluded: true,
        status: "ACTIVE",
      },
    });

    await offersApi.createForProduct("p1", {
      durationPreset: "3M",
      listAmount: 99900,
      saleAmount: 79900,
      status: "ACTIVE",
    });

    expect(post).toHaveBeenCalledWith("/v1/admin/products/p1/offers", {
      durationPreset: "3M",
      listAmount: 99900,
      saleAmount: 79900,
      status: "ACTIVE",
    });
  });

  it("updates an offer", async () => {
    patch.mockResolvedValue({
      message: "ok",
      data: {
        id: "o1",
        productId: "p1",
        durationPreset: "3M",
        currency: "INR",
        listAmount: 89900,
        taxIncluded: true,
        status: "INACTIVE",
      },
    });

    await offersApi.update("o1", {
      listAmount: 89900,
      status: "INACTIVE",
      saleAmount: null,
    });

    expect(patch).toHaveBeenCalledWith("/v1/admin/offers/o1", {
      listAmount: 89900,
      status: "INACTIVE",
      saleAmount: null,
    });
  });
});
