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
  it("searches categories and moves through emoji choices with the keyboard", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Add emoji" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Search emojis" }), {
      target: { value: "coffee" },
    });
    expect(screen.getByRole("button", { name: "Coffee" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Smile" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Gestures" }));
    const first = screen.getByRole("button", { name: "Thumbs up" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Thumbs down" }),
    );
  });
  it("clears drafts when the room changes", () => {
    const client = new QueryClient();
    const view = render(
      <QueryClientProvider client={client}>
        <ChatPanel id="one" kind="rooms" title="One" />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), {
      target: { value: "Private draft for room one" },
    });
    view.rerender(
      <QueryClientProvider client={client}>
        <ChatPanel id="two" kind="rooms" title="Two" />
      </QueryClientProvider>,
    );
    expect(
      (screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement)
        .value,
    ).toBe("");
  });
  it("shows retained history alongside a recoverable refresh notice", () => {
    vi.mocked(useMessages).mockReturnValue({
      ...empty,
      error: new Error("Temporary failure"),
      messages: [
        {
          id: "cached",
          sender_id: "self",
          content: "Previously loaded",
          created_at: "2026-11-15T00:00:00Z",
          deleted_at: null,
          profiles: { username: "Self", avatar_seed: "seed" },
          reactions: [],
        },
      ],
    } as any);
    mount();
    expect(screen.getByText("Previously loaded")).toBeTruthy();
    expect(screen.getAllByRole("status").map(node => node.textContent).join(" ")).toContain(
      "Showing previously loaded",
    );
  });
  it("prevents empty sends and preserves Shift+Enter", () => {
    mount();
    const input = screen.getByRole("textbox", { name: "Message" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(api).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(api).not.toHaveBeenCalled();
  });
  it("inserts an emoji at the selection and returns focus without submitting", async () => {
    mount();
    const input = screen.getByRole("textbox", {
      name: "Message",
    }) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "hello world" } });
    input.setSelectionRange(6, 11);
    fireEvent.click(screen.getByRole("button", { name: "Add emoji" }));
    fireEvent.click(screen.getByRole("button", { name: "Smile" }));
    expect(input.value).toBe("hello 😀");
    expect(api).not.toHaveBeenCalled();
    await waitFor(() => expect(document.activeElement).toBe(input));
    fireEvent.click(screen.getByRole("button", { name: "Add emoji" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "Smile" }), {
      key: "Escape",
    });
    expect(screen.queryByRole("group", { name: "Choose an emoji" })).toBeNull();
  });
  it("prevents emoji insertion beyond the message limit", () => {
    mount();
    const input = screen.getByRole("textbox", {
      name: "Message",
    }) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "a".repeat(999) } });
    input.setSelectionRange(999, 999);
    fireEvent.click(screen.getByRole("button", { name: "Add emoji" }));
    expect(
      (
        screen.getByRole("button", {
          name: "Smile",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
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
    await screen.findByText("Didn’t go through. Try again.");
    const original = vi.mocked(api).mock.calls[0][2];
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api).mock.calls[1][2]).toEqual(original);
    await waitFor(() =>
      expect(screen.queryByText("Didn’t go through. Try again.")).toBeNull(),
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
  it("does not activate javascript URLs or interpret Unicode text as markup", () => {
    const content = "javascript:alert(1) — مرحبا 🫂 <script>no()</script>";
    vi.mocked(useMessages).mockReturnValue({
      ...empty,
      messages: [
        {
          id: "safe",
          sender_id: "self",
          content,
          created_at: "2026-11-04T12:00:00Z",
          deleted_at: null,
          profiles: { username: "Fixture", avatar_seed: "seed" },
          reactions: [],
        },
      ],
    } as any);
    const { container } = mount();
    expect(screen.getByText(content)).toBeTruthy();
    expect(container.querySelector('a[href^="javascript:"],script')).toBeNull();
  });
});
