// @vitest-environment jsdom
import { renderHook, act, cleanup } from "@testing-library/react";
import { it, expect, vi, afterEach } from "vitest";
import { useMessageAnnouncement } from "../../src/react-app/hooks/useMessageAnnouncement";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("stays quiet by default and does not announce initial or older history", () => {
  vi.useFakeTimers();
  const h = renderHook(
    ({ cursor, enabled }) =>
      useMessageAnnouncement(cursor, "Reader", true, enabled),
    { initialProps: { cursor: "02", enabled: false } },
  );
  h.rerender({ cursor: "03", enabled: false });
  act(() => vi.advanceTimersByTime(600));
  expect(h.result.current.text).toBe("");
  h.rerender({ cursor: "03", enabled: true });
  act(() => vi.advanceTimersByTime(600));
  expect(h.result.current.text).toBe("");
  h.rerender({ cursor: "04", enabled: true });
  act(() => vi.advanceTimersByTime(600));
  expect(h.result.current.text).toBe("New message from Reader.");
  h.rerender({ cursor: "01", enabled: true });
  act(() => vi.advanceTimersByTime(600));
  expect(h.result.current.key).toBe("04");
});
