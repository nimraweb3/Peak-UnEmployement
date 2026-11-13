import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, frontendDemo } from "../../lib/api";
import { useSession } from "../../contexts/session";
import { moods, type ProfileDetails } from "../../../shared/accounts";
import { Button } from "../ui/button";
import { UsernameField } from "./UsernameField";
import { EmploymentEditor } from "./EmploymentEditor";
import { AccountSecurity } from "./AccountSecurity";
import { MediaEditor } from "./MediaEditor";
export function ProfileEditor() {
  const { profile } = useSession();
  const qc = useQueryClient();
  const cooldown = useQuery({ queryKey: ["username-cooldown"], queryFn: () => api<{ next_change_at: string | null }>("/me/username"), enabled: !frontendDemo });
  const nextChange = cooldown.data?.next_change_at;
  const locked = !!nextChange && new Date(nextChange).getTime() > Date.now();
  const query = useQuery({
    queryKey: ["profile-details"],
    queryFn: () => api<ProfileDetails | null>("/me/profile"),
    enabled: !frontendDemo,
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [draft, setDraft] = useState<Partial<ProfileDetails> | null>(null),
    [handle, setHandle] = useState<string | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const d = draft ||
    query.data || {
      display_name: "",
      bio: "",
      mood: "",
      visibility: "members",
    };
  if (frontendDemo)
    return (
      <p className="notice">
        Custom profiles require a connected account. This preview does not
        simulate profile storage.
      </p>
    );
  return (
    <>
      <section className="settings-section glass">
        <h2>Make this profile yours</h2>
        <p>
          Your display name can be a nickname. Your login email stays private.
        </p>
        {query.error && (
          <p role="alert">Couldn’t load your profile. Reload to try again.</p>
        )}
        <MediaEditor kind="avatar" path={query.data?.avatar_path} />
        <MediaEditor kind="banner" path={query.data?.banner_path} />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/me/profile", "PATCH", {
                display_name: d.display_name || "",
                bio: d.bio || "",
                mood: d.mood || "",
                visibility: d.visibility || "members",
              });
              await qc.invalidateQueries({ queryKey: ["profile-details"] });
              setNotice("Saved.");
            } catch (e) {
              setError((e as Error).message);
              setSuggestions(
                (e as Error & { suggestions?: string[] }).suggestions || [],
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Display name
            <input
              maxLength={40}
              value={d.display_name || ""}
              onChange={(e) => setDraft({ ...d, display_name: e.target.value })}
            />
          </label>
          <label>
            About you
            <textarea
              maxLength={300}
              value={d.bio || ""}
              onChange={(e) => setDraft({ ...d, bio: e.target.value })}
            />
            <span className="fine-print">{d.bio?.length || 0}/300</span>
          </label>
          <label>
            Mood
            <select
              value={d.mood || ""}
              onChange={(e) => setDraft({ ...d, mood: e.target.value })}
            >
              {moods.map((m) => (
                <option key={m} value={m}>
                  {m || "No mood"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Who can open my full profile?
            <select
              value={d.visibility || "members"}
              onChange={(e) =>
                setDraft({
                  ...d,
                  visibility: e.target.value as ProfileDetails["visibility"],
                })
              }
            >
              <option value="public">Anyone with the link</option>
              <option value="members">Signed-in members</option>
              <option value="private">Only me</option>
            </select>
          </label>
          <p className="fine-print">
            Your chat handle and messages remain visible in public rooms.
            Uploaded images are public assets; don’t upload private photos.
          </p>
          <Button disabled={busy || query.isLoading || !!query.error}>
            Save profile details
          </Button>
        </form>
        <h3>Your handle</h3>
        {suggestions.map((s) => (
          <Button key={s} variant="outline" onClick={() => setHandle(s)}>
            {s}
          </Button>
        ))}
        <UsernameField
          value={handle ?? profile?.username ?? ""}
          onChange={setHandle}
        />
        <p className="fine-print">
          You can change your handle once every 30 days. Your old profile link
          will stop working.
          {locked && ` Available again ${new Date(nextChange!).toLocaleString()}.`}
        </p>
        <Button
          variant="outline"
          disabled={busy || locked || cooldown.isLoading || !!cooldown.error || !handle || handle === profile?.username}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await api("/me/username", "PATCH", { username: handle });
              await qc.invalidateQueries({ queryKey: ["me"] });
              await qc.invalidateQueries({ queryKey: ["username-cooldown"] });
              setNotice("Username saved.");
            } catch (e) {
              setError((e as Error).message);
              setSuggestions(
                (e as Error & { suggestions?: string[] }).suggestions || [],
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Save username
        </Button>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
      </section>
      <EmploymentEditor />
      <AccountSecurity />
    </>
  );
}
