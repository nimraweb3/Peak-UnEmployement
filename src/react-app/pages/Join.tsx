import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Avatar, Loading, ErrorState } from "../components/common";
import { Turnstile } from "../components/Turnstile";
import { useSession } from "../contexts/session";
import { api, configured, supabase } from "../lib/api";
import { eras, industries, nickname } from "../../shared/config";
export default function Join() {
  const { session, profile, loading, error } = useSession();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [name, setName] = useState("");
  const [era, setEra] = useState<string>("Prefer not to say");
  const [industry, setIndustry] = useState("");
  const [profession, setProfession] = useState("");
  const [dm, setDm] = useState(false);
  async function join() {
    setBusy(true);
    setFailure("");
    try {
      if (!supabase) throw new Error("Supabase is not configured yet.");
      const { error } = await supabase.auth.signInAnonymously({
        options: { captchaToken: token },
      });
      if (error) throw error;
      setStep(1);
    } catch (e) {
      setFailure((e as Error).message);
      setToken("");
    } finally {
      setBusy(false);
    }
  }
  async function finish() {
    setBusy(true);
    setFailure("");
    try {
      await api("/me", "PATCH", {
        username: name || profile?.username,
        industry_id: industry || null,
        profession,
        unemployment_status: era,
        allows_dm_requests: dm,
        onboarding_completed: true,
      });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Welcome to the unemployment club.");
      nav("/app/lounge");
    } catch (e) {
      setFailure((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const stage = session ? Math.max(1, step) : 0;
  return (
    <main className="join-page">
      <Link to="/" className="logo">
        peak<span>.</span>
      </Link>
      <Link className="back-link" to="/">
        ← Back to the good kind of chaos
      </Link>
      <section className="onboarding glass">
        <span className="eyebrow">NO COVER LETTER REQUIRED</span>
        <div className="progress-track">
          {[0, 1, 2, 3, 4].map((n) => (
            <span key={n} className={n <= stage ? "active" : ""} />
          ))}
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState
            error={error}
            retry={() => void qc.invalidateQueries({ queryKey: ["me"] })}
          />
        ) : (
          <>
            {stage === 0 && (
              <>
                <h1>
                  A new era.
                  <br />
                  <em>A little company.</em>
                </h1>
                <p>
                  You don’t need a job title to belong here. Join with an
                  anonymous identity and find your people.
                </p>
                <div className="notice">
                  <ShieldCheck />
                  <div>
                    <strong>Your identity is yours.</strong>
                    <p>
                      No real name or email required. Anonymous access lives in
                      this browser. Link an account later to keep it across
                      devices.
                    </p>
                  </div>
                </div>
                {!configured ? (
                  <div className="notice warning">
                    <div>
                      <strong>Live community isn’t connected yet.</strong>
                      <p>
                        This installation needs Supabase and Turnstile
                        configuration. The landing page is available, but
                        joining and chat are not active.
                      </p>
                    </div>
                  </div>
                ) : !import.meta.env.VITE_TURNSTILE_SITE_KEY ? (
                  <p role="alert">
                    The operator needs to configure a Turnstile site key before
                    signup.
                  </p>
                ) : (
                  <Turnstile key={failure} onToken={setToken} />
                )}
                <Button
                  className="full-width"
                  disabled={!configured || !token || busy}
                  onClick={() => void join()}
                >
                  {busy ? "Creating your identity…" : "Join anonymously"}
                  <ArrowRight size={18} />
                </Button>
                <p className="fine-print">
                  By joining, you agree to our <Link to="/terms">terms</Link>{" "}
                  and{" "}
                  <Link to="/community-guidelines">community guidelines</Link>.
                </p>
                <p className="fine-print">
                  Already linked an account?{" "}
                  <Link to="/recover">Sign in by email ↗</Link>
                </p>
              </>
            )}
            {stage === 1 && (
              <>
                <h1>
                  Meet your
                  <br />
                  <em>unprofessional self.</em>
                </h1>
                <Avatar
                  seed={profile?.avatar_seed}
                  name={name || profile?.username}
                  large
                />
                <label>
                  Your public nickname
                  <input
                    value={name || profile?.username || ""}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={30}
                  />
                </label>
                <Button variant="ghost" onClick={() => setName(nickname())}>
                  <RefreshCw size={16} />
                  Give me another identity
                </Button>
                <p className="fine-print">
                  Letters, numbers, and underscores. Your real identity stays
                  off your public profile.
                </p>
              </>
            )}
            {stage === 2 && (
              <>
                <h1>
                  Which unemployment
                  <br />
                  <em>era are you in?</em>
                </h1>
                <p>
                  No explanation needed. This is just how you describe your
                  situation.
                </p>
                <div className="choices">
                  {eras.map((value) => (
                    <button
                      key={value}
                      className={era === value ? "choice selected" : "choice"}
                      onClick={() => setEra(value)}
                      aria-pressed={era === value}
                    >
                      {value}
                      <span>{era === value ? "✓" : "○"}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {stage === 3 && (
              <>
                <h1>
                  Find your
                  <br />
                  <em>kind of people.</em>
                </h1>
                <p>
                  Your industry suggests a room. You’re welcome in all of them.
                </p>
                <div className="choices two-col">
                  {industries.map((item) => (
                    <button
                      key={item.slug}
                      className={
                        industry === item.slug ? "choice selected" : "choice"
                      }
                      onClick={() => {
                        setIndustry(item.slug);
                        setProfession("");
                      }}
                      aria-pressed={industry === item.slug}
                    >
                      <span>{item.icon}</span>
                      {item.name}
                    </button>
                  ))}
                </div>
                <label>
                  Profession (optional)
                  <select
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                  >
                    <option value="">Still figuring it out</option>
                    {industries
                      .find((i) => i.slug === industry)
                      ?.professions.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                  </select>
                </label>
              </>
            )}
            {stage === 4 && (
              <>
                <h1>
                  Your space.
                  <br />
                  <em>Your boundaries.</em>
                </h1>
                <div className="setting-row">
                  <div>
                    <strong>Let strangers request a conversation?</strong>
                    <p>
                      Off by default. No private messages arrive until you
                      accept a request. Change this any time.
                    </p>
                  </div>
                  <input
                    className="switch"
                    type="checkbox"
                    aria-label="Allow private message requests"
                    checked={dm}
                    onChange={(e) => setDm(e.target.checked)}
                  />
                </div>
                <div className="notice">
                  <ShieldCheck />
                  <p>
                    Clearing browser storage, signing out, or switching devices
                    may lose this anonymous account. Link an email in Settings
                    when you’re ready.
                  </p>
                </div>
              </>
            )}
            {failure && (
              <p className="form-error" role="alert">
                {failure}
              </p>
            )}
            {stage > 0 && (
              <div className="onboarding-actions">
                {stage > 1 ? (
                  <Button variant="ghost" onClick={() => setStep(stage - 1)}>
                    <ArrowLeft size={16} />
                    Back
                  </Button>
                ) : (
                  <span />
                )}
                {stage < 4 ? (
                  <Button onClick={() => setStep(stage + 1)}>
                    Continue
                    <ArrowRight size={16} />
                  </Button>
                ) : (
                  <Button onClick={() => void finish()} disabled={busy}>
                    {busy ? "Making room…" : "Enter the lounge"}
                    <ArrowRight size={16} />
                  </Button>
                )}
              </div>
            )}
            {stage > 1 && stage < 4 && (
              <button className="skip-link" onClick={() => setStep(stage + 1)}>
                Skip for now
              </button>
            )}
          </>
        )}
      </section>
      <p className="join-bottom">
        Currently unemployed. Professionally online.
      </p>
    </main>
  );
}
