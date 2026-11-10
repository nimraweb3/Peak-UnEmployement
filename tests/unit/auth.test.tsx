// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Recover from "../../src/react-app/pages/Recover";
const auth = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signInWithOAuth: vi.fn(),
}));
vi.mock("../../src/react-app/lib/api", () => ({ supabase: { auth } }));
vi.mock("../../src/react-app/components/Turnstile", () => ({
  Turnstile: ({ onToken }: { onToken: (token: string) => void }) => (
    <button type="button" onClick={() => onToken("captcha")}>
      Solve CAPTCHA
    </button>
  ),
}));
beforeEach(() => {
  vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "test");
  Object.values(auth).forEach((fn) =>
    fn.mockReset().mockResolvedValue({ error: null }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});
it("requires a verification response, exposes invalid-code errors, and permits another attempt", async () => {
  render(
    <MemoryRouter>
      <Recover />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "river@example.test" },
  });
  expect(
    screen.getByRole("button", { name: "Send verification code" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Solve CAPTCHA" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Send verification code" }),
  );
  await screen.findByLabelText("Verification code");
  expect(auth.verifyOtp).not.toHaveBeenCalled();
  auth.verifyOtp.mockResolvedValueOnce({
    error: new Error("Code expired. Request another code."),
  });
  fireEvent.change(screen.getByLabelText("Verification code"), {
    target: { value: "123456" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Verify email and continue" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Code expired");
  expect(auth.verifyOtp).toHaveBeenCalledWith({
    email: "river@example.test",
    token: "123456",
    type: "email",
  });
  fireEvent.click(
    screen.getByRole("button", {
      name: "Change email or request another code",
    }),
  );
  expect(
    screen.getByRole("button", { name: "Send verification code" }),
  ).toBeDisabled();
});
it("shows OAuth failure inline without trapping the submit state", async () => {
  auth.signInWithOAuth.mockResolvedValue({
    error: new Error("Google provider unavailable"),
  });
  render(
    <MemoryRouter>
      <Recover />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Google provider unavailable",
    ),
  );
  expect(
    screen.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
  expect(auth.signInWithOAuth).toHaveBeenCalledWith({
    provider: "google",
    options: { redirectTo: location.origin + "/app/settings" },
  });
});
