// @vitest-environment jsdom
import React from "react";
import { it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../../src/react-app/components/ui/button";
it("prevents submitting disabled actions and preserves link semantics", () => {
  const click = vi.fn();
  const { unmount } = render(
    <Button disabled onClick={click}>
      Send
    </Button>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  expect(click).not.toHaveBeenCalled();
  unmount();
  render(
    <Button asChild>
      <a href="/join">Join</a>
    </Button>,
  );
  expect(screen.getByRole("link", { name: "Join" }).getAttribute("href")).toBe(
    "/join",
  );
});
