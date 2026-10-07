import { describe, expect, it } from "vitest";
import * as api from "./index";

describe("ezprep-api public surface", () => {
  it("re-exports clients, helpers, and resource APIs", () => {
    expect(api.ezPrepApiClient).toBeDefined();
    expect(api.ezPrepApiServerClient).toBeDefined();
    expect(api.catalogApi).toBeDefined();
    expect(api.questionsApi).toBeDefined();
    expect(api.mockTestsApi).toBeDefined();
    expect(api.filesApi).toBeDefined();
    expect(api.currentAffairsApi).toBeDefined();
    expect(api.adminDashboardApi).toBeDefined();
    expect(api.usersApi).toBeDefined();
    expect(api.instanceConfigApi).toBeDefined();
    expect(api.productsApi).toBeDefined();
    expect(api.offersApi).toBeDefined();
    expect(api.rupeesToPaise).toBeTypeOf("function");
    expect(api.paiseToRupees).toBeTypeOf("function");
    expect(api.formatEzPrepError).toBeTypeOf("function");
    expect(api.buildEzPrepApiUrl).toBeTypeOf("function");
    expect(api.EZPREP_PROXY_PREFIX).toBe("/api/ezprep");
  });
});
