// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { renderHook, cleanup, act } from "@testing-library/react";
const state = vi.hoisted(() => ({
  error: null as unknown,
  status: "joined",
  callback: undefined as undefined | ((status: string) => void),
  refresh: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: state.refresh }),
  useInfiniteQuery: () => ({
    error: state.error,
    data: {
      pages: [
        {
          items: [
            { id: "a", created_at: "2026-11-15T00:00:00Z", content: "cached" },
          ],
        },
      ],
    },
  }),
}));
vi.mock("../../src/react-app/lib/api", () => ({
  api: vi.fn(),
  demoMode: false,
  frontendDemo: false,
  supabase: {
    channel: () => {
      const channel = {
        get state() {
          return state.status;
        },
        on: () => channel,
        subscribe: (callback: (status: string) => void) => {
          state.callback = callback;
          return channel;
        },
      };
      return channel;
    },
    removeChannel: state.remove,
  },
}));
import { useMessages } from "../../src/react-app/hooks/useMessages";
afterEach(() => {
  cleanup();
  state.error = null;
  vi.clearAllMocks();
});
it("keeps cached history on a gateway failure but hides it on denied access", () => {
  const view = renderHook(() => useMessages("conversations", "one"));
  expect(view.result.current.messages).toHaveLength(1);
  state.error = { status: 503 };
  view.rerender();
  expect(view.result.current.messages).toHaveLength(1);
  state.error = { status: 403 };
  view.rerender();
  expect(view.result.current.messages).toHaveLength(0);
});
it("restores a still-joined connection after going online and cleans up", () => {
  const view = renderHook(() => useMessages("rooms", "one"));
  act(() => window.dispatchEvent(new Event("offline")));
  expect(view.result.current.connection).toBe("Offline");
  act(() => window.dispatchEvent(new Event("online")));
  expect(view.result.current.connection).toBe("Live");
  view.unmount();
  expect(state.remove).toHaveBeenCalled();
});
