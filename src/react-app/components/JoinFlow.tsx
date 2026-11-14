import { employmentStatuses } from "../../shared/accounts";
import { useIndustries, useProfessions } from "../hooks/useIndustries";
import { UsernameField } from "./profile/UsernameField";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "./ui/dialog";
import { Button } from "./ui/button";
import { Avatar } from "./common";
import { Turnstile } from "./Turnstile";
import { Brand } from "../../shared/brand";
import { industries, nickname } from "../../shared/config";
import { api, configured, supabase, frontendDemo } from "../lib/api";
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
  const industriesQuery = useIndustries(!!session);
  const [profession, setProfession] = useState("");
  const [step, setStep] = useState(1);
  const [name, setName] = useState(() => profile?.username || nickname().toLowerCase());
  const [industry, setIndustry] = useState(profile?.industry_id || "");
  const professionsQuery = useProfessions(industry);
  const [era, setEra] = useState(
    profile?.unemployment_status || "Prefer not to say",
  );
  const [startMonth, setStartMonth] = useState("");
  const [showEmployment, setShowEmployment] = useState(false);
  const [dm, setDm] = useState(profile?.allows_dm_requests || false);
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function next() {
    setError("");
    if (step === 1 && !/^[a-z0-9_]{3,20}$/.test(name)) {
      setError("Use 3–20 lowercase letters, numbers, or underscores.");
      return;
    }
    if (step === 1 && !session) {
      setBusy(true);
      try {
        if (frontendDemo) {
          (await import("../lib/frontend-demo")).joinLocal();
          setStep(2);
          return;
        }
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
        setStep(1);
      } catch (e) {
        setError((e as Error).message);
        setToken("");
        setAttempt((n) => n + 1);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (step === 1 && session && !frontendDemo) {
      setBusy(true);
      try {
        const checked = await api<{ available: boolean }>(
          "/usernames/availability?username=" + encodeURIComponent(name),
        );
        if (!checked.available)
          throw new Error(
            "That username isn’t available. Choose another or use a suggestion.",
          );
        setStep(2);
      } catch (e) {
        setError((e as Error).message);
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
      await api(
        frontendDemo ? "/me" : "/onboarding/complete",
        frontendDemo ? "PATCH" : "POST",
        {
          username: name,
          industry_id: industry || null,
          profession,
          unemployment_status: era,
          allows_dm_requests: dm,
          onboarding_completed: true,
          ...(!frontendDemo
            ? {
                start_month:
                  era === "Currently unemployed" && startMonth
                    ? startMonth + "-01"
                    : null,
                show_employment: showEmployment,
              }
            : {}),
        },
      );
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("You’re in.");
      onComplete();
    } catch (e) {
      setError((e as Error).message);
      if ((e as Error).message.includes("nickname")) setStep(1);
    } finally {
      setBusy(false);
    }
  }
  const titles = [
    "Come on in.",
    "What line of work are you in?",
    "What’s your situation?",
    "Open to message requests?",
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
          "No real name needed. Pick a username and you’re good.",
          "Pick a starting point. You can join any room.",
          "Optional. There’s no right answer.",
          "Others can ask to chat privately. You decide who gets through.",
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
              <UsernameField value={name} onChange={setName} />
              <button
                type="button"
                className="icon-button"
                aria-label="Try another nickname"
                title="Try another"
                onClick={() => setName(nickname().toLowerCase())}
              >
                <RefreshCw size={19} />
              </button>
            </div>
            {frontendDemo && (
              <p className="notice">
                Frontend demo: your nickname and messages exist only in this tab
                until you reload. No account is created.
              </p>
            )}
            {!session &&
              !frontendDemo &&
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
              {frontendDemo
                ? "Try the complete joining flow. Private message requests start off."
                : "An anonymous account stays in this browser. Link an email later to keep access on other devices."}
            </p>
          </>
        )}
        {step === 2 && (
          <div className="choices two-col">
            {industriesQuery.data?.map((i) => (
              <button
                type="button"
                key={i.id}
                className={`choice ${industry === i.id ? "selected" : ""}`}
                aria-pressed={industry === i.id}
                onClick={() => {
                  setIndustry(i.id);
                  setProfession("");
                }}
              >
                <span aria-hidden="true">
                  {industries.find((item) => item.slug === i.id)?.icon || "○"}
                </span>
                {i.name}
              </button>
            ))}
          </div>
        )}
        {step === 2 && industry && (
          <label>
            Profession (optional)
            <select
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
            >
              <option value="">Prefer not to say</option>
              {professionsQuery.data?.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {step === 2 && industriesQuery.error && (
          <p role="alert">
            Couldn’t load industries. You can skip this step and try later.
          </p>
        )}
        {step === 3 && (
          <div className="choices">
            {employmentStatuses.map((e) => (
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
        {step === 3 && !frontendDemo && (
          <>
            {era === "Currently unemployed" && (
              <label>
                Since when? (optional)
                <input
                  type="month"
                  max={new Date().toISOString().slice(0, 7)}
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                />
              </label>
            )}
            <label>
              <input
                type="checkbox"
                checked={showEmployment}
                onChange={(e) => setShowEmployment(e.target.checked)}
              />{" "}
              Show this situation and start month on my profile
            </label>
            <p className="fine-print">
              Off by default. You can change this in Settings.
            </p>
          </>
        )}
        {step === 4 && (
          <>
            <div className="setting-row">
              <label htmlFor="join-dm">
                <strong>Allow message requests</strong>
                <span>You can accept or decline each request.</span>
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
              busy ||
              (step === 1 &&
                !session &&
                !frontendDemo &&
                (!configured || !token))
            }
          >
            {busy
              ? "Joining…"
              : step === 4
                ? "Enter the conversation"
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
          <a href="/community-guidelines">community guidelines</a>. Been here
          before?{" "}
          <a
            href={
              "/auth?returnTo=" +
              encodeURIComponent(
                new URLSearchParams(location.search).get("returnTo") ||
                  (location.pathname.startsWith("/rooms/")
                    ? location.pathname
                    : "/app/lounge"),
              )
            }
          >
            Continue with Google or email.
          </a>
        </p>
      </form>
    </Modal>
  );
}
