import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/auth/logout", () => {
  it("clears the admin session cookie", async () => {
    const response = await POST();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Signed out" });
    const cookie = response.cookies.get("ezprep_admin_session");
    expect(cookie?.value).toBe("");
  });
});
