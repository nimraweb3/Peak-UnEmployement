import { describe, expect, it } from "vitest";
import { unwrap } from "../../src/worker/lib";
import app from "../../src/worker/index";

describe("hardened error and edge boundary", () => {
  it("does not return database schema details", () => {
    expect(() =>
      unwrap({
        data: null,
        error: {
          code: "23503",
          message: "private.identities constraint secret_internal_name",
        },
      }),
    ).toThrow("The request could not be completed.");
  });
  it("returns a retry hint when the shared network limiter denies access", async () => {
    const result = await app.request(
      "/api/health",
      { headers: { "CF-Connecting-IP": "192.0.2.1" } },
      {
        NETWORK_LIMITER: { limit: async () => ({ success: false }) },
      },
    );
    expect(result.status).toBe(429);
    expect(result.headers.get("Retry-After")).toBe("60");
  });
});
