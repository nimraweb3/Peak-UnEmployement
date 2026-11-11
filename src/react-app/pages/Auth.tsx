import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { supabase, api } from "../lib/api";
import { useSession } from "../contexts/session";
import { Brand } from "../../shared/brand";
import { Button } from "../components/ui/button";
import { Turnstile } from "../components/Turnstile";
export function safeReturn(value: string | null) {
  return value &&
    /^\/(?:rooms\/[a-z-]+|app\/(?:lounge|settings|messages)|)$/.test(value)
    ? value
    : "/app/lounge";
}
export default function Auth() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { session, recovery } = useSession();
  const initial = params.get("mode");
  const [mode, setMode] = useState(
    initial === "signup" || initial === "forgot" || initial === "reset"
      ? initial
      : "login",
  );
  const [unverified, setUnverified] = useState(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [token, setToken] = useState(""),
    [attempt, setAttempt] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [cooldown, setCooldown] = useState(0);
  const emailReady = import.meta.env.VITE_EMAIL_AUTH_ENABLED === "true";
  const destination = safeReturn(params.get("returnTo"));
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const callback = (reset = false) =>
    location.origin +
    "/auth/callback?" +
    new URLSearchParams({
      returnTo: destination,
      ...(reset ? { recovery: "1" } : {}),
    });
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      if (!supabase) throw new Error("Account services aren’t connected yet.");
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setToken("");
      setAttempt((n) => n + 1);
    }
  }
  async function submit() {
    await run(async () => {
      if (!supabase) return;
      if (mode === "reset") {
        if (!recovery || !session)
          throw new Error("Open a valid password-reset link to continue.");
        if (password.length < 12 || password !== confirm)
          throw new Error("Use at least 12 characters and matching passwords.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        await supabase.auth.signOut();
        setNotice("Password updated. Sign in with your new password.");
        setMode("login");
        return;
      }
      if (mode === "forgot") {
        if (!emailReady)
          throw new Error("Email delivery isn’t configured yet.");
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: callback(true), captchaToken: token },
        );
        if (error)
          throw new Error(
            "Unable to request a reset right now. Try again later.",
          );
        setNotice(
          "If this address can receive a reset email, a link is on its way.",
        );
        setCooldown(60);
        return;
      }
      if (mode === "signup") {
        if (!emailReady)
          throw new Error("Email registration isn’t configured yet.");
        if (password.length < 12 || password !== confirm)
          throw new Error("Use at least 12 characters and matching passwords.");
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: callback(), captchaToken: token },
        });
        if (error) throw error;
        setNotice(
          "We sent you a verification link. Open it to finish setting up your account.",
        );
        setCooldown(60);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
        options: { captchaToken: token },
      });
      if (error) {
        if (error.code === "email_not_confirmed") setUnverified(true);
        throw error;
      }
      const account = await api<{ onboarding_completed: boolean }>("/me");
      nav(
        account.onboarding_completed
          ? destination
          : "/join?returnTo=" + encodeURIComponent(destination),
        { replace: true },
      );
    });
  }
  return (
    <main className="join-page">
      <Link to="/" aria-label="Peak Unemployment home">
        <Brand />
      </Link>
      <form
        className="onboarding glass"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <h1>
          {notice && mode === "signup"
            ? "Check your inbox."
            : mode === "signup"
              ? "Make yourself at home."
              : mode === "forgot"
                ? "Forgot your password?"
                : mode === "reset"
                  ? "Choose a new password."
                  : "Good to see you."}
        </h1>
        <p>Your login stays private. Your public name is up to you.</p>
        {!supabase && (
          <p className="notice">
            Account services aren’t connected yet. Public rooms are still
            available to read.
          </p>
        )}
        {mode !== "reset" && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={!supabase || busy}
              onClick={() =>
                void run(async () => {
                  const { error } = await supabase!.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: callback() },
                  });
                  if (error) throw error;
                })
              }
            >
              Continue with Google
            </Button>
            <label>
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </>
        )}
        {mode !== "forgot" && (
          <label>
            Password
            <input
              type="password"
              required
              minLength={mode === "login" ? 1 : 12}
              maxLength={128}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {(mode === "signup" || mode === "reset") && (
          <label>
            Confirm password
            <input
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
        )}
        {mode !== "reset" && import.meta.env.VITE_TURNSTILE_SITE_KEY && (
          <Turnstile key={attempt} onToken={setToken} />
        )}
        {!emailReady && (mode === "signup" || mode === "forgot") && (
          <p className="notice">
            Email delivery hasn’t been configured. Google sign-in is separate.
          </p>
        )}
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <Button
          disabled={
            busy ||
            !supabase ||
            ((mode === "signup" || mode === "forgot") &&
              (!emailReady || cooldown > 0)) ||
            (mode === "reset" && !recovery) ||
            (mode !== "reset" &&
              !!import.meta.env.VITE_TURNSTILE_SITE_KEY &&
              !token)
          }
        >
          {busy
            ? "Please wait…"
            : mode === "signup"
              ? "Create account"
              : mode === "forgot"
                ? "Send reset link"
                : mode === "reset"
                  ? "Save new password"
                  : "Sign in"}
        </Button>
        {emailReady && ((mode === "signup" && notice) || unverified) && (
          <Button
            type="button"
            variant="outline"
            disabled={
              busy ||
              cooldown > 0 ||
              (!!import.meta.env.VITE_TURNSTILE_SITE_KEY && !token)
            }
            onClick={() =>
              void run(async () => {
                const { error } = await supabase!.auth.resend({
                  type: "signup",
                  email: email.trim(),
                  options: { emailRedirectTo: callback(), captchaToken: token },
                });
                if (error) throw error;
                setCooldown(60);
                setNotice("Verification email requested. Check your inbox.");
              })
            }
          >
            {cooldown ? `Resend in ${cooldown}s` : "Resend verification email"}
          </Button>
        )}
        <nav className="auth-options">
          {(["login", "signup", "forgot"] as const)
            .filter((m) => m !== mode)
            .map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => {
                  setMode(m);
                  setUnverified(false);
                  setError("");
                  setNotice("");
                  setPassword("");
                  setConfirm("");
                }}
              >
                {m === "login"
                  ? "Sign in"
                  : m === "signup"
                    ? "Create account"
                    : "Forgot password?"}
              </button>
            ))}
        </nav>
        <p className="fine-print">
          By creating an account, you agree to the{" "}
          <Link to="/terms">terms</Link> and{" "}
          <Link to="/community-guidelines">community guidelines</Link>.
        </p>
      </form>
    </main>
  );
}
export function AuthCallback() {
  const { ready, session, profile, error, recovery } = useSession();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const failure = params.get("error");
  useEffect(() => {
    if (!ready || !session || failure) return;
    if (recovery) nav("/auth?mode=reset", { replace: true });
    else if (profile)
      nav(
        profile.onboarding_completed
          ? safeReturn(params.get("returnTo"))
          : "/join?returnTo=" +
              encodeURIComponent(safeReturn(params.get("returnTo"))),
        { replace: true },
      );
  }, [ready, session, profile, failure, recovery, params, nav]);
  return (
    <main className="join-page">
      <div className="onboarding glass">
        <h1>{failure ? "Sign-in wasn’t completed." : "Finishing sign-in…"}</h1>
        {(error || failure || (ready && !session)) && (
          <p role="alert">
            The sign-in link may have expired or been cancelled. Request a new
            link and open it in the same browser.
          </p>
        )}
        <Link to="/auth">Back to sign-in</Link>
      </div>
    </main>
  );
}
