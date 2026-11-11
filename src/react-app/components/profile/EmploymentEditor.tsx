import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, frontendDemo } from "../../lib/api";
import {
  employmentStatuses,
  monthDuration,
  type Employment,
  type Period,
} from "../../../shared/accounts";
import { Button } from "../ui/button";
export function EmploymentEditor() {
  const qc = useQueryClient();
  const data = useQuery({
    queryKey: ["employment"],
    queryFn: () => api<Employment | null>("/me/employment"),
    enabled: !frontendDemo,
  });
  const periods = useQuery({
    queryKey: ["periods"],
    queryFn: () => api<Period[]>("/me/unemployment-periods"),
    enabled: !frontendDemo,
  });
  const [draft, setDraft] = useState<Employment | null>(null),
    [editing, setEditing] = useState<string | null>(null),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const form = draft ||
    data.data || {
      status: "Prefer not to say",
      show_status: false,
      show_history: false,
    };
  async function perform(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await qc.invalidateQueries({ queryKey: ["employment"] });
      await qc.invalidateQueries({ queryKey: ["periods"] });
      setNotice("Saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (frontendDemo)
    return (
      <p className="notice">
        Employment history needs a connected account. It is not simulated in
        this preview.
      </p>
    );
  return (
    <section className="settings-section glass">
      <h2>Work & time between jobs</h2>
      <p>These details stay private unless you choose to share them.</p>
      {(data.error || periods.error) && (
        <p role="alert">Couldn’t load employment information. Try reloading.</p>
      )}
      <label>
        Current situation
        <select
          value={form.status}
          onChange={(e) => setDraft({ ...form, status: e.target.value })}
        >
          {employmentStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={form.show_status}
          onChange={(e) => setDraft({ ...form, show_status: e.target.checked })}
        />{" "}
        Show my situation on my profile
      </label>
      <label>
        <input
          type="checkbox"
          checked={form.show_history}
          onChange={(e) =>
            setDraft({ ...form, show_history: e.target.checked })
          }
        />{" "}
        Show my history on my profile
      </label>
      <Button
        disabled={busy || data.isLoading || !!data.error}
        onClick={() => void perform(() => api("/me/employment", "PATCH", form))}
      >
        Save employment preferences
      </Button>
      <h3>Unemployment history</h3>
      <p className="fine-print">
        An end month doesn’t change your current situation. Leave it blank for
        an ongoing period.
      </p>
      {periods.data?.map((p) => (
        <article className="employment-period" key={p.id}>
          <p>
            {p.start_month.slice(0, 7)} —{" "}
            {p.end_month?.slice(0, 7) || "Present"} ·{" "}
            {monthDuration(p.start_month, p.end_month)} calendar months
          </p>
          <p>{p.note}</p>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              setEditing(p.id);
              setStart(p.start_month.slice(0, 7));
              setEnd(p.end_month?.slice(0, 7) || "");
              setNote(p.note);
            }}
          >
            Edit period
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() =>
              void perform(() =>
                api("/me/unemployment-periods/" + p.id, "DELETE"),
              )
            }
          >
            Remove period
          </Button>
        </article>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void perform(async () => {
            await api(
              "/me/unemployment-periods" + (editing ? "/" + editing : ""),
              editing ? "PATCH" : "POST",
              {
                start_month: start + "-01",
                end_month: end ? end + "-01" : null,
                note,
              },
            );
            setEditing(null);
            setStart("");
            setEnd("");
            setNote("");
          });
        }}
      >
        <div className="form-grid">
          <label>
            Start month
            <input
              type="month"
              required
              max={new Date().toISOString().slice(0, 7)}
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            End month (optional)
            <input
              type="month"
              max={new Date().toISOString().slice(0, 7)}
              min={start}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <label>
          Note (optional)
          <input
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <Button disabled={busy}>
          {editing ? "Save period" : "Add period"}
        </Button>
        {editing && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setEditing(null);
              setStart("");
              setEnd("");
              setNote("");
            }}
          >
            Cancel edit
          </Button>
        )}
      </form>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
