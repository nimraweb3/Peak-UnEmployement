// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  act,
} from "@testing-library/react";
import { ConversationDemo } from "../../src/react-app/components/chat/ConversationDemo";
vi.mock("../../src/react-app/contexts/preferences", () => ({
  usePreferences: () => ({ reduced: false }),
}));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("keeps fiction opt-in, pauses, replays and skips without API calls", () => {
  vi.useFakeTimers();
  HTMLElement.prototype.scrollTo = vi.fn();
  render(<ConversationDemo />);
  expect(screen.queryByText(/Got rejected/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Play demo" }));
  act(() => vi.advanceTimersByTime(1800));
  expect(screen.getByText(/Got rejected/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Pause demo" }));
  act(() => vi.advanceTimersByTime(30000));
  expect(screen.queryByText(/They rejected/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Replay demo" }));
  expect(screen.queryByText(/Got rejected/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Skip demonstration" }));
  expect(screen.queryByLabelText("Fictional conversation")).toBeNull();
});
