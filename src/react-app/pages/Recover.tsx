import { Brand } from "../../shared/brand";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { supabase } from "../lib/api";
import { Turnstile } from "../components/Turnstile";
import { Button } from "../components/ui/button";

export default function Recover() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function google() {
    if (!supabase) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: location.origin + "/app/settings" },
      });
      if (error) throw error;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="join-page">
      <Link aria-label="Peak Unemployment home" to="/">
        <Brand />
      </Link>
      <form
        className="onboarding glass"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            if (!supabase)
              throw new Error("Connect Supabase to enable account sign-in.");
            if (sent) {
              const { error } = await supabase.auth.verifyOtp({
                email: email.trim(),
                token: code.trim(),
                type: "email",
              });
              if (error) throw error;
              navigate("/app/settings", { replace: true });
            } else {
              const { error } = await supabase.auth.signInWithOtp({
                email: email.trim(),
                options: { shouldCreateUser: true, captchaToken: token },
              });
              if (error) throw error;
              setSent(true);
            }
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
            setToken("");
            setAttempt((n) => n + 1);
          }
        }}
      >
        <span className="eyebrow">Your place in the conversation</span>
        <h1>{sent ? "Check your inbox." : "Good to see you."}</h1>
        <p>
          {sent
            ? "Enter the verification code sent to " +
              email +
              ". Your email is kept private."
            : "Sign in or create an account. Your public nickname stays separate from your email."}
        </p>
        {!supabase && (
          <p className="notice">
            Sign-in isn’t available yet. You can still read the public rooms.
          </p>
        )}
        {!sent && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={!supabase || busy}
              onClick={() => void google()}
            >
              <span aria-hidden="true">G</span> Continue with Google
            </Button>
            <p className="fine-print">Or verify your email</p>
          </>
        )}
        <label>
          Email
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            readOnly={sent}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {sent ? (
          <label>
            Verification code
            <input
              required
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6,10}"
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
        ) : (
          import.meta.env.VITE_TURNSTILE_SITE_KEY && (
            <Turnstile key={attempt} onToken={setToken} />
          )
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <Button disabled={!supabase || busy || (!sent && !token)}>
          {busy
            ? "Please wait…"
            : sent
              ? "Verify email and continue"
              : "Send verification code"}
        </Button>
        {sent && (
          <button
            type="button"
            className="skip-step"
            disabled={busy}
            onClick={() => {
              setSent(false);
              setCode("");
              setError("");
            }}
          >
            Change email or request another code
          </button>
        )}
        <p className="fine-print">
          By continuing, you agree to our <Link to="/terms">terms</Link> and{" "}
          <Link to="/privacy">privacy policy</Link>.
        </p>
        <Link to="/join">Prefer to join anonymously?</Link>
      </form>
    </main>
  );
}
