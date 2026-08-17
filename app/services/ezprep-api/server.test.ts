import { describe, expect, it } from "vitest";
import { ezPrepApiServerClient as fromServer } from "./server";
import { ezPrepApiServerClient as fromClient } from "./client";

describe("server client re-export", () => {
  it("is the same object as the server-side client", () => {
    expect(fromServer).toBe(fromClient);
  });
});
