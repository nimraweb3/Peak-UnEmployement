import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "./ui/dialog";
import { Button } from "./ui/button";
import { Avatar } from "./common";
import { Turnstile } from "./Turnstile";
import { Brand } from "../../shared/brand";
import { industries, eras, nickname } from "../../shared/config";
import { api, configured, supabase } from "../lib/api";
import { useSession } from "../contexts/session";
export default function JoinFlow({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: () => void;
}) {
  const { session, profile } = useSession();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(() => profile?.username || nickname());
  const [industry, setIndustry] = useState(profile?.industry_id || "");
  const [era, setEra] = useState(
    profile?.unemployment_status || "Prefer not to say",
  );
  const [dm, setDm] = useState(profile?.allows_dm_requests || false);
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function next() {
    setError("");
    if (step === 1 && !/^[A-Za-z0-9_]{3,30}$/.test(name)) {
      setError("Use 3–30 letters, numbers, or underscores.");
      return;
    }
    if (step === 1 && !session) {
      setBusy(true);
      try {
        if (!supabase)
          throw new Error(
            "Joining isn’t available until this community is connected.",
          );
        const result = await supabase.auth.signInAnonymously({
          options: { captchaToken: token },
        });
        if (result.error) throw result.error;
        await api("/me");
        await qc.invalidateQueries({ queryKey: ["me"] });
        setStep(2);
      } catch (e) {
        setError((e as Error).message);
        setToken("");
        setAttempt((n) => n + 1);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      await api("/me", "PATCH", {
        username: name,
        industry_id: industry || null,
        unemployment_status: era,
        allows_dm_requests: dm,
        onboarding_completed: true,
      });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("You’re in.");
      onComplete();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const titles = [
    "Pick a name. Keep yours private.",
    "Which room feels like you?",
    "Where are you at?",
    "Who gets to message you?",
  ];
  return (
    <Modal
      open
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
      title={titles[step - 1]}
      description={
        [
          "No real name or email required. You can change your nickname later.",
          "A starting point, not a restriction. Every room is open to you.",
          "Optional. There’s no right answer.",
          "Private conversations start with your permission.",
        ][step - 1]
      }
    >
      <div className="join-brand">
        <Brand />
        <span>{step} / 4</span>
      </div>
      <div
        className="progress-track"
        role="img"
        aria-label={`Step ${step} of 4`}
      >
        {[1, 2, 3, 4].map((n) => (
          <i key={n} className={n <= step ? "active" : ""} />
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void next();
        }}
      >
        {step === 1 && (
          <>
            <div className="nickname-picker">
              <Avatar name={name} seed={profile?.avatar_seed || name} large />
              <label>
                Your public nickname
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                  autoComplete="off"
                  aria-invalid={!!error}
                  aria-describedby={error ? "join-error" : undefined}
                />
              </label>
              <button
                type="button"
                className="icon-button"
                aria-label="Regenerate nickname"
                onClick={() => setName(nickname())}
              >
                <RefreshCw size={19} />
              </button>
            </div>
            {!session &&
              (!configured ? (
                <div className="notice warning">
                  Joining is currently unavailable. This installation needs
                  Supabase and Turnstile configuration.
                </div>
              ) : !import.meta.env.VITE_TURNSTILE_SITE_KEY ? (
                <p role="alert">
                  Joining is unavailable until CAPTCHA is configured.
                </p>
              ) : (
                <Turnstile key={attempt} onToken={setToken} />
              ))}
            <p className="fine-print">
              An anonymous account stays in this browser. Link an email later to
              keep access on other devices.
            </p>
          </>
        )}
        {step === 2 && (
          <div className="choices two-col">
            {industries.map((i) => (
              <button
                type="button"
                key={i.slug}
                className={`choice ${industry === i.slug ? "selected" : ""}`}
                aria-pressed={industry === i.slug}
                onClick={() => setIndustry(i.slug)}
              >
                <span aria-hidden="true">{i.icon}</span>
                {i.name}
              </button>
            ))}
          </div>
        )}
        {step === 3 && (
          <div className="choices">
            {eras.map((e) => (
              <button
                type="button"
                key={e}
                className={`choice ${era === e ? "selected" : ""}`}
                aria-pressed={era === e}
                onClick={() => setEra(e)}
              >
                {e}
                <span aria-hidden="true">{era === e ? "✓" : "○"}</span>
              </button>
            ))}
          </div>
        )}
        {step === 4 && (
          <>
            <div className="setting-row">
              <label htmlFor="join-dm">
                <strong>Allow message requests</strong>
                <span>
                  Other members can ask to start a private chat. You decide who
                  gets through.
                </span>
              </label>
              <input
                id="join-dm"
                className="switch"
                type="checkbox"
                checked={dm}
                onChange={(e) => setDm(e.target.checked)}
              />
            </div>
            <div className="notice">
              Off means no new requests. Even when it’s on, nobody can send a
              private message until you accept.
            </div>
            <p className="fine-print">
              Public messages can be read by anyone, including visitors. Keep
              personal information out of the conversation.
            </p>
          </>
        )}
        {error && (
          <p id="join-error" className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="onboarding-actions">
          {step > 1 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(step - 1)}
              disabled={busy}
            >
              <ArrowLeft size={16} />
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="submit"
            disabled={
              busy || (step === 1 && !session && (!configured || !token))
            }
          >
            {busy
              ? "Joining…"
              : step === 4
                ? "Join the conversation"
                : "Continue"}
            <ArrowRight size={16} />
          </Button>
        </div>
        {step > 1 && step < 4 && (
          <button
            type="button"
            className="skip-step"
            onClick={() => setStep(step + 1)}
          >
            Skip this step
          </button>
        )}
        <p className="fine-print">
          By joining, you agree to the <a href="/terms">terms</a> and{" "}
          <a href="/community-guidelines">community guidelines</a>. Already
          linked? <a href="/recover">Sign in by email.</a>
        </p>
      </form>
    </Modal>
  );
}
