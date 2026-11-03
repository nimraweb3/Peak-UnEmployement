// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChatPanel } from "../../src/react-app/components/chat/ChatPanel";
import { api } from "../../src/react-app/lib/api";
import { useMessages } from "../../src/react-app/hooks/useMessages";
vi.mock("../../src/react-app/lib/api", () => ({
  api: vi.fn(),
  supabase: null,
}));
vi.mock("../../src/react-app/hooks/useMessages", () => ({
  useMessages: vi.fn(),
}));
vi.mock("../../src/react-app/contexts/session", () => ({
  useSession: () => ({ profile: { id: "self" } }),
}));
vi.mock("../../src/react-app/contexts/preferences", () => ({
  usePreferences: () => ({ reduced: true }),
}));
const empty = {
  messages: [],
  connection: "Live",
  data: { pages: [{ items: [], next: null }] },
  hasNextPage: false,
  isLoading: false,
  error: null,
};
function mount() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ChatPanel id="room" kind="rooms" title="Lounge" />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useMessages).mockReturnValue(empty as any);
});
afterEach(cleanup);
describe("message composer behavior", () => {
  it("prevents empty sends and preserves Shift+Enter", () => {
    mount();
    const input = screen.getByRole("textbox", { name: "Message" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(api).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(api).not.toHaveBeenCalled();
  });
  it("shows failed state and retries the same idempotency key", async () => {
    vi.mocked(api)
      .mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValueOnce({ ok: true });
    mount();
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), {
      target: { value: "A small win" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByText("Failed to send");
    const original = vi.mocked(api).mock.calls[0][2];
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api).mock.calls[1][2]).toEqual(original);
    await waitFor(() =>
      expect(screen.queryByText("Failed to send")).toBeNull(),
    );
  });
  it("renders user content as text and never reveals deleted bodies", () => {
    vi.mocked(useMessages).mockReturnValue({
      ...empty,
      messages: [
        {
          id: "a",
          sender_id: "self",
          content: "<img src=x onerror=alert(1)>",
          created_at: "2026-11-02T12:00:00Z",
          deleted_at: null,
          profiles: { username: "Example", avatar_seed: "seed" },
          reactions: [],
        },
        {
          id: "b",
          sender_id: "self",
          content: "removed secret",
          created_at: "2026-11-02T12:00:01Z",
          deleted_at: "2026-11-02T12:01:00Z",
          profiles: { username: "Example", avatar_seed: "seed" },
          reactions: [],
        },
      ],
    } as any);
    const { container } = mount();
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByText("removed secret")).toBeNull();
    expect(screen.getByText("This message was removed.")).toBeTruthy();
  });
});
