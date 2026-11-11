import { Turnstile } from "../Turnstile";
import { useState } from "react";
import { supabase } from "../../lib/api";
import { useSession } from "../../contexts/session";
import { Button } from "../ui/button";
import { Link } from "react-router";
export function AccountSecurity() {
  const [captcha, setCaptcha] = useState("");
  const [attempt, setAttempt] = useState(0);
  const { session } = useSession();
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [nonce, setNonce] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const emailIdentity = session?.user.identities?.some(
    (i) => i.provider === "email",
  );
  if (!supabase || session?.user.is_anonymous) return null;
  return (
    <section className="settings-section glass">
      <h2>Account security</h2>
      <p className="fine-print">
        If you sign in with an email code and haven’t set a password, use{" "}
        <Link to="/auth?mode=forgot">email recovery to set one</Link>.
      </p>
      {emailIdentity ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              if (password.length < 12 || password !== confirm)
                throw new Error(
                  "Use at least 12 characters and matching passwords.",
                );
              const verified = await supabase!.auth.signInWithPassword({
                email: session!.user.email!,
                password: current,
                options: { captchaToken: captcha },
              });
              if (verified.error) throw verified.error;
              const changed = await supabase!.auth.updateUser({
                password,
                ...(nonce ? { nonce } : {}),
              });
              if (changed.error) throw changed.error;
              setNotice("Password changed.");
              setPassword("");
              setConfirm("");
              setCurrent("");
              setNonce("");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
              setCaptcha("");
              setAttempt((n) => n + 1);
            }
          }}
        >
          <label>
            Current password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label>
            New password
            <input
              required
              minLength={12}
              maxLength={128}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            Confirm new password
            <input
              required
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <label>
            Security code (if requested)
            <input
              autoComplete="one-time-code"
              value={nonce}
              onChange={(e) => setNonce(e.target.value)}
            />
          </label>
          {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
            <Turnstile key={attempt} onToken={setCaptcha} />
          )}
          <Button
            disabled={
              busy || (!!import.meta.env.VITE_TURNSTILE_SITE_KEY && !captcha)
            }
          >
            Change password
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const result = await supabase!.auth.reauthenticate();
              setBusy(false);
              if (result.error) setError(result.error.message);
              else setNotice("Check your email for the security code.");
            }}
          >
            Request security code
          </Button>
        </form>
      ) : (
        <>
          <p>
            You sign in with Google. To set up a password, request an email
            recovery link and verify it first.
          </p>
          <Link to="/auth?mode=forgot">Set up password</Link>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
