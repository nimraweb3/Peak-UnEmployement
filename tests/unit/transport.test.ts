import { afterEach, expect, it, vi } from "vitest";
import {
  requestJson,
  authorizationLost,
} from "../../src/react-app/lib/transport";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("preserves a valid null response and empty 204", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json(null))
      .mockResolvedValueOnce(new Response(null, { status: 204 })),
  );
  expect(await requestJson("/api/me/profile")).toBeNull();
  expect(await requestJson("/api/action")).toBeUndefined();
});
it("preserves status and suggestions without leaking an HTML gateway body", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response("<html>private upstream details</html>", { status: 502 }),
      )
      .mockResolvedValueOnce(
        Response.json(
          { error: "Choose another", suggestions: ["available"] },
          { status: 409 },
        ),
      ),
  );
  await expect(requestJson("/api/test")).rejects.toMatchObject({
    status: 502,
    message: "The service is temporarily unavailable. Please try again.",
  });
  await expect(requestJson("/api/test")).rejects.toMatchObject({
    status: 409,
    suggestions: ["available"],
  });
});
it("rejects malformed successful responses with a readable error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json")));
  await expect(requestJson("/api/test")).rejects.toMatchObject({ status: 502 });
});
it("aborts in-flight work when its caller cancels", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (_url, options) =>
        new Promise((_resolve, reject) =>
          options.signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          ),
        ),
    ),
  );
  const controller = new AbortController();
  const request = requestJson("/api/test", { signal: controller.signal });
  controller.abort();
  await expect(request).rejects.toMatchObject({ name: "AbortError" });
});
it("bounds slow requests without leaking a timeout rejection", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (_url, options) =>
        new Promise((_resolve, reject) =>
          options.signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          ),
        ),
    ),
  );
  const assertion = expect(requestJson("/api/test")).rejects.toMatchObject({
    status: 408,
  });
  await vi.advanceTimersByTimeAsync(20000);
  await assertion;
  expect(vi.getTimerCount()).toBe(0);
});
it("distinguishes authorization loss from recoverable refresh failures", () => {
  expect(authorizationLost({ status: 401 })).toBe(true);
  expect(authorizationLost({ status: 403 })).toBe(true);
  expect(authorizationLost({ status: 503 })).toBe(false);
  expect(authorizationLost(null)).toBe(false);
});
