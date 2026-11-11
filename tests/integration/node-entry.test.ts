import { it, expect, vi, afterEach } from "vitest";
import app from "../../server";
afterEach(() => vi.unstubAllEnvs());
it("fails closed for a production Node origin without proxy protection", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("API_PROXY_SECRET", "");
  expect((await app.request("/api/health")).status).toBe(503);
});
it("accepts only the matching server proxy secret and limits CORS to the frontend", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("API_PROXY_SECRET", "test-server-secret");
  vi.stubEnv("FRONTEND_ORIGIN", "https://frontend.example");
  expect(
    (
      await app.request("/api/health", {
        headers: { "X-API-Proxy-Secret": "wrong" },
      })
    ).status,
  ).toBe(403);
  const result = await app.request("/api/health", {
    headers: {
      "X-API-Proxy-Secret": "test-server-secret",
      Origin: "https://frontend.example",
    },
  });
  expect(result.status).toBe(200);
  expect(result.headers.get("Access-Control-Allow-Origin")).toBe(
    "https://frontend.example",
  );
  expect(await result.text()).not.toContain("test-server-secret");
});
