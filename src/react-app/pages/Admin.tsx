import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api";
import { Loading, ErrorState, Empty } from "../components/common";
import { Button } from "../components/ui/button";
type Report = {
  reported_content: string | null;
  id: string;
  target_user: string | null;
  message_id: string | null;
  category: string;
  detail: string;
  created_at: string;
};
export default function Admin() {
  const qc = useQueryClient();
  const reports = useQuery({
    queryKey: ["reports"],
    queryFn: () => api<Report[]>("/admin/reports"),
  });
  const metrics = useQuery({
    queryKey: ["metrics"],
    queryFn: () => api<Record<string, unknown>>("/admin/metrics"),
  });
  async function act(payload: unknown) {
    try {
      await api("/admin/moderate", "POST", payload);
      await qc.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Moderation action saved.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <div className="content-page">
      <span className="eyebrow">MODERATOR ACCESS ONLY</span>
      <h1>
        Moderation
      </h1>
      <p>
        Review reports carefully. Hiding removes the stored message body;
        restricting prevents further actions.
      </p>
      {reports.isLoading ? (
        <Loading />
      ) : reports.error ? (
        <ErrorState error={reports.error} />
      ) : reports.data?.length ? (
        reports.data.map((r) => (
          <article className="settings-section glass" key={r.id}>
            <h3>{r.category}</h3>
            <time>{new Date(r.created_at).toLocaleString()}</time>
            <p>{r.detail || "No additional context provided."}</p>
            {r.message_id && (
              <blockquote className="reported-content">
                {r.reported_content || "Message removed or unavailable."}
              </blockquote>
            )}
            <small>Reported public profile: {r.target_user || "Deleted"}</small>
            <div className="account-actions">
              {r.message_id && (
                <Button
                  variant="outline"
                  onClick={() =>
                    void act({ action: "hide", message_id: r.message_id })
                  }
                >
                  Remove message
                </Button>
              )}
              {r.target_user && (
                <Button
                  variant="danger"
                  onClick={() =>
                    void act({ action: "restrict", user_id: r.target_user })
                  }
                >
                  Restrict account
                </Button>
              )}
              <Button
                onClick={() => void act({ action: "resolve", report_id: r.id })}
              >
                Mark reviewed
              </Button>
            </div>
          </article>
        ))
      ) : (
        <Empty title="All caught up." description="No unresolved reports." />
      )}
      <h2>Community activity</h2>
      <p className="fine-print">
        Active means distinct public message senders in the trailing 24 hours /
        30 days. No private content is included.
      </p>
      {metrics.data && (
        <pre className="metrics">{JSON.stringify(metrics.data, null, 2)}</pre>
      )}
    </div>
  );
}
