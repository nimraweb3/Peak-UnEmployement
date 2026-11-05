import { Brand } from "../../shared/brand";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { supabase } from "../lib/api";
import { Turnstile } from "../components/Turnstile";
import { Button } from "../components/ui/button";
export default function Recover() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
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
          try {
            if (!supabase) throw new Error("Supabase is not configured.");
            const { error } = await supabase.auth.signInWithOtp({
              email,
              options: {
                shouldCreateUser: false,
                captchaToken: token,
                emailRedirectTo: `${location.origin}/app/settings`,
              },
            });
            if (error) throw error;
            toast.success(
              "If this email is linked to an account, check your inbox for a sign-in link.",
            );
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1>Sign in by email</h1>
        <p>
          Use the email you previously linked. An unlinked anonymous account
          cannot be recovered here.
        </p>
        <label>
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
          <Turnstile onToken={setToken} />
        )}
        <Button disabled={busy || !token}>Send sign-in link</Button>
      </form>
    </main>
  );
}
