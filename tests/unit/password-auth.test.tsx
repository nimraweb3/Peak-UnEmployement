// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Auth, { safeReturn } from "../../src/react-app/pages/Auth";
const auth = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  resend: vi.fn(),
  updateUser: vi.fn(),
}));
vi.mock("../../src/react-app/lib/api", () => ({ supabase: { auth } }));
vi.mock("../../src/react-app/contexts/session", () => ({
  useSession: () => ({ session: null, recovery: false }),
}));
beforeEach(() => {
  vi.stubEnv("VITE_EMAIL_AUTH_ENABLED", "true");
  vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");
  Object.values(auth).forEach((f) =>
    f.mockReset().mockResolvedValue({ error: null }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});
it("requests real signup confirmation without granting a session", async () => {
  render(
    <MemoryRouter initialEntries={["/auth?mode=signup"]}>
      <Auth />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "test@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
    target: { value: "a-long-password-123" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "a-long-password-123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "verification link",
  );
  expect(auth.signUp).toHaveBeenCalledWith(
    expect.objectContaining({
      email: "test@example.test",
      options: expect.objectContaining({
        emailRedirectTo: expect.stringContaining("/auth/callback?"),
      }),
    }),
  );
  expect(screen.getByRole("button", { name: /Resend in/ })).toBeDisabled();
});
it("does not infer a recovery session from a URL parameter", () => {
  render(
    <MemoryRouter initialEntries={["/auth?mode=reset"]}>
      <Auth />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("button", { name: "Save new password" }),
  ).toBeDisabled();
  expect(auth.updateUser).not.toHaveBeenCalled();
});
it("keeps password recovery responses neutral", async () => {
  render(
    <MemoryRouter initialEntries={["/auth?mode=forgot"]}>
      <Auth />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "unknown@example.test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "If this address",
  );
});
it("does not enable email registration without SMTP readiness", () => {
  vi.stubEnv("VITE_EMAIL_AUTH_ENABLED", "false");
  render(
    <MemoryRouter initialEntries={["/auth?mode=signup"]}>
      <Auth />
    </MemoryRouter>,
  );
  expect(screen.getByRole("button", { name: "Create account" })).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
});
it("constrains post-auth destinations to known local routes", () => {
  expect(safeReturn("//evil.test")).toBe("/app/lounge");
  expect(safeReturn("/rooms/design")).toBe("/rooms/design");
  expect(safeReturn("/auth?mode=reset")).toBe("/app/lounge");
});
