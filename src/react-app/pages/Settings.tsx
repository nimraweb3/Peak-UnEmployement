import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { useSession } from "../contexts/session";
import { usePreferences } from "../contexts/preferences";
import { api, supabase } from "../lib/api";
import { Avatar, ErrorState, Loading } from "../components/common";
import { Button } from "../components/ui/button";
import { Modal } from "../components/ui/dialog";
import { eras, industries } from "../../shared/config";
import type { Profile } from "../../shared/types";
export default function Settings() {
  const { profile, session } = useSession();
  const {
    theme,
    setTheme,
    reduced,
    setReduced,
    announcements,
    setAnnouncements,
  } = usePreferences();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [form, setForm] = useState<Partial<Profile>>({});
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "signout" | null>(null);
  const [deletionText, setDeletionText] = useState("");
  const blocks = useQuery({
    queryKey: ["blocks"],
    queryFn: () => api<{ blocked_id: string; profile: Profile }[]>("/blocks"),
  });
  if (!profile) return <Loading />;
  const value = { ...profile, ...form };
  const update = (key: keyof Profile, val: unknown) =>
    setForm((p) => ({ ...p, [key]: val }));
  async function save() {
    setBusy(true);
    try {
      await api("/me", "PATCH", form);
      await qc.invalidateQueries({ queryKey: ["me"] });
      setForm({});
      toast.success("Preferences saved.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function leave() {
    setBusy(true);
    try {
      if (confirm === "delete") await api("/me", "DELETE");
      const result = await supabase?.auth.signOut({ scope: "local" });
      if (result?.error) throw result.error;
      qc.clear();
      nav("/");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }
  return (
    <div className="content-page settings-page">
      <span className="eyebrow">YOUR ACCOUNT</span>
      <h1>Your profile & preferences</h1>
      <p className="page-intro">
        Choose what you share and how this space works for you.
      </p>
      <section className="settings-section glass">
        <h2>Your anonymous identity</h2>
        <div className="avatar-setting">
          <Avatar seed={value.avatar_seed} name={value.username} large />
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => update("avatar_seed", crypto.randomUUID())}
            >
              <RefreshCw size={15} />
              Change avatar
            </Button>
            <p className="fine-print">An avatar without a profile photo.</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            Public nickname
            <input
              value={value.username}
              maxLength={30}
              onChange={(e) => update("username", e.target.value)}
            />
          </label>
          <label>
            Your current status
            <input
              value={value.public_status}
              placeholder="Currently ignoring LinkedIn."
              maxLength={120}
              onChange={(e) => update("public_status", e.target.value)}
            />
          </label>
          <label>
            Industry
            <select
              value={value.industry_id || ""}
              onChange={(e) => {
                update("industry_id", e.target.value || null);
                update("profession", "");
              }}
            >
              <option value="">Prefer not to say</option>
              {industries.map((i) => (
                <option value={i.slug} key={i.slug}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Profession
            <select
              value={value.profession}
              onChange={(e) => update("profession", e.target.value)}
            >
              <option value="">Still figuring it out</option>
              {industries
                .find((i) => i.slug === value.industry_id)
                ?.professions.map((p) => (
                  <option key={p}>{p}</option>
                ))}
            </select>
          </label>
          <label>
            Your situation
            <select
              value={value.unemployment_status}
              onChange={(e) => update("unemployment_status", e.target.value)}
            >
              {eras.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </label>
          <div className="joined-date">
            Joined
            <br />
            <strong>
              {new Date(profile.created_at).toLocaleDateString(undefined, {
                dateStyle: "long",
              })}
            </strong>
          </div>
        </div>
        <div className="setting-row">
          <div>
            <strong>Allow message requests</strong>
            <p>
              You still approve each request. Turning this off prevents new
              requests; existing conversations stay available.
            </p>
          </div>
          <input
            className="switch"
            type="checkbox"
            aria-label="Allow message requests"
            checked={value.allows_dm_requests}
            onChange={(e) => update("allows_dm_requests", e.target.checked)}
          />
        </div>
        <Button
          disabled={busy || !Object.keys(form).length}
          onClick={() => void save()}
        >
          {busy ? "Saving…" : "Save profile & preferences"}
        </Button>
      </section>
      <section className="settings-section glass">
        <h2>Appearance & accessibility</h2>
        <div className="theme-options">
          {[
            ["light", "Day Shift"],
            ["dark", "Night Shift"],
            ["system", "System"],
          ].map(([id, label]) => (
            <button
              className={`theme-choice theme-${id} ${theme === id ? "selected" : ""}`}
              key={id}
              aria-pressed={theme === id}
              onClick={() => setTheme(id)}
            >
              <span />
              <strong>{label}</strong>
            </button>
          ))}
        </div>
        <div className="setting-row">
          <div>
            <strong>Reduce motion</strong>
            <p>
              Limit interface animations. Your device preference is also
              respected.
            </p>
          </div>
          <input
            className="switch"
            type="checkbox"
            checked={reduced}
            onChange={(e) => setReduced(e.target.checked)}
            aria-label="Reduce motion"
          />
        </div>
        <div className="setting-row">
          <div>
            <strong>Announce new messages</strong>
            <p>
              Let your screen reader announce when unread messages arrive. Off
              by default.
            </p>
          </div>
          <input
            className="switch"
            type="checkbox"
            checked={announcements}
            onChange={(e) => setAnnouncements(e.target.checked)}
            aria-label="Announce new messages"
          />
        </div>
        <p className="fine-print">
          Appearance preferences are saved in this browser.
        </p>
      </section>
      <section className="settings-section glass">
        <h2>Blocked members</h2>
        <p className="muted">
          Blocked people can’t chat with you privately. Public content is hidden
          in both directions for signed-in accounts. Public posts remain
          readable as a guest.
        </p>
        {blocks.isLoading ? (
          <Loading />
        ) : blocks.error ? (
          <ErrorState error={blocks.error} />
        ) : blocks.data?.length ? (
          blocks.data.map((b) => (
            <div className="inbox-row" key={b.blocked_id}>
              <Avatar name={b.profile.username} seed={b.profile.avatar_seed} />
              <strong>{b.profile.username}</strong>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await api(`/blocks/${b.blocked_id}`, "DELETE");
                    await qc.invalidateQueries();
                    toast.success("User unblocked.");
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                Unblock
              </Button>
            </div>
          ))
        ) : (
          <p className="fine-print">No blocked users.</p>
        )}
      </section>
      <section className="settings-section glass">
        <h2>Keep your place here</h2>
        <div className="notice">
          <ShieldCheck />
          <p>
            {session?.user.is_anonymous
              ? "Your account is anonymous. Signing out, clearing storage, or changing devices can lose access. Link an email to preserve this identity. Your email is never public."
              : "Your account is linked. Your public identity is still anonymous."}
          </p>
        </div>
        {session?.user.is_anonymous && (
          <form
            className="email-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const result = await supabase?.auth.updateUser(
                  { email },
                  { emailRedirectTo: `${location.origin}/app/settings` },
                );
                if (result?.error) throw result.error;
                toast.success(
                  "Check your email and confirm the link to preserve your account.",
                );
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Recovery email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <Button disabled={busy}>Send confirmation</Button>
          </form>
        )}
        <p className="fine-print">
          Already linked on another device?{" "}
          <button onClick={() => nav("/recover")}>Sign in by email ↗</button>
        </p>
        <div className="account-actions">
          <Button variant="outline" onClick={() => setConfirm("signout")}>
            Sign out
          </Button>
          <Button variant="danger" onClick={() => setConfirm("delete")}>
            Delete account & data
          </Button>
        </div>
      </section>
      <Modal
        open={!!confirm}
        onOpenChange={() => setConfirm(null)}
        title={confirm === "delete" ? "Delete your account?" : "Sign out?"}
        description={
          confirm === "delete"
            ? "This permanently removes your account, profile, messages, reactions, and conversations. This cannot be undone."
            : session?.user.is_anonymous
              ? "This anonymous account may be impossible to recover after sign-out. Link an email first if you want to return."
              : "You can return using your linked email."
        }
      >
        {confirm === "delete" && (
          <label>
            Type DELETE to confirm
            <input
              value={deletionText}
              onChange={(e) => setDeletionText(e.target.value)}
            />
          </label>
        )}
        <div className="modal-actions">
          <Button variant="outline" onClick={() => setConfirm(null)}>
            Stay here
          </Button>
          <Button
            variant="danger"
            disabled={
              busy || (confirm === "delete" && deletionText !== "DELETE")
            }
            onClick={() => void leave()}
          >
            {confirm === "delete" ? "Permanently delete" : "Sign out"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
