import { beforeEach, describe, expect, it, vi } from "vitest";
import { ezPrepApiClient } from "./browser-client";
import { ordersApi, type AdminOrderDetail } from "./orders";

vi.mock("./browser-client", () => ({
  ezPrepApiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const get = vi.mocked(ezPrepApiClient.get);
const post = vi.mocked(ezPrepApiClient.post);

const detail: AdminOrderDetail = {
  id: "order1",
  orderNumber: "ORD-1001",
  userId: "user1",
  user: {
    id: "user1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    phoneNumber: "+919876543210",
    username: "ada",
  },
  status: "PAID",
  amount: 99900,
  currency: "INR",
  items: [],
  payment: null,
  invoice: null,
  refund: null,
};

describe("ordersApi buyer redaction", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("masks email and phone before an order detail enters the UI", async () => {
    get.mockResolvedValue({ message: "ok", data: detail });

    const response = await ordersApi.get("order1");

    expect(response.data.user).toEqual({
      id: "user1",
      name: "Ada Lovelace",
      email: "a***@example.com",
      phoneNumber: "+91**********",
      username: "ada",
    });
    expect(JSON.stringify(response)).not.toContain("ada@example.com");
    expect(JSON.stringify(response)).not.toContain("9876543210");
  });

  it("masks buyers on the order list", async () => {
    get.mockResolvedValue({ message: "ok", data: [detail], pagination: undefined });

    const response = await ordersApi.list();

    expect(response.data[0].user?.email).toBe("a***@example.com");
    expect(response.data[0].user?.phoneNumber).toBe("+91**********");
    expect(JSON.stringify(response)).not.toContain("ada@example.com");
  });

  it("masks the buyer on repair and refund responses", async () => {
    post.mockResolvedValueOnce({ message: "ok", data: detail });
    post.mockResolvedValueOnce({
      message: "ok",
      data: { refund: { id: "rf1" }, order: detail },
    });

    const repaired = await ordersApi.repair("order1");
    const refunded = await ordersApi.refund("order1", { reason: "request" });

    expect(repaired.data.user?.email).toBe("a***@example.com");
    expect(refunded.data.order.user?.phoneNumber).toBe("+91**********");
    expect(JSON.stringify(repaired)).not.toContain("9876543210");
    expect(JSON.stringify(refunded)).not.toContain("ada@example.com");
  });
});
