import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "../ui/dialog";
import { Button } from "../ui/button";
import { Avatar, Loading, ErrorState } from "../common";
import { api } from "../../lib/api";
import { categories } from "../../../shared/config";
import type { Profile } from "../../../shared/types";
export function PersonDialog({
  id,
  messageId,
  onClose,
}: {
  id: string | null;
  messageId?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile", id],
    queryFn: () => api<Profile>(`/profiles/${id}`),
    enabled: !!id,
    staleTime: 0,
  });
  const [report, setReport] = useState(false);
  const [category, setCategory] = useState<string>("Harassment");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  async function act(path: string, body: unknown, label: string) {
    setBusy(true);
    try {
      await api(path, "POST", body);
      toast.success(label);
      await qc.invalidateQueries();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={!!id}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={report ? "Report to moderators" : "A fellow human"}
      description={
        report
          ? "Reports are private. Include context without personal information."
          : "Anonymous by design. Treat the person behind the nickname with care."
      }
    >
      {profile.isLoading ? (
        <Loading />
      ) : profile.error ? (
        <ErrorState error={profile.error} />
      ) : (
        profile.data && (
          <>
            <div className="person-summary">
              <Avatar
                seed={profile.data.avatar_seed}
                name={profile.data.username}
                large
              />
              <h3>{profile.data.username}</h3>
              <p>{profile.data.public_status || "Professionally available."}</p>
              <small>
                {profile.data.profession ||
                  profile.data.industry_id ||
                  "Finding their next chapter"}
              </small>
            </div>
            {!report ? (
              <div className="stack">
                {profile.data.allows_dm_requests ? (
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void act(
                        "/dm-requests",
                        { recipient_id: id },
                        "Request sent. The next move is theirs.",
                      )
                    }
                  >
                    Request chat
                  </Button>
                ) : (
                  <p className="fine-print">
                    This person isn’t accepting private chat requests.
                  </p>
                )}
                <Button variant="outline" onClick={() => setReport(true)}>
                  Report {messageId ? "message" : "user"}
                </Button>
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() =>
                    void act(
                      "/blocks",
                      { user_id: id },
                      "User blocked. Manage blocks in Settings.",
                    )
                  }
                >
                  Block user
                </Button>
              </div>
            ) : (
              <div className="stack">
                <label>
                  Reason
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Additional context (optional)
                  <textarea
                    maxLength={500}
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                  />
                </label>
                <Button
                  disabled={busy}
                  onClick={() =>
                    void act(
                      "/reports",
                      {
                        target_user: id,
                        message_id: messageId || null,
                        category,
                        detail,
                      },
                      "Report received. Thank you for looking out for the community.",
                    )
                  }
                >
                  Submit report
                </Button>
                <Button variant="ghost" onClick={() => setReport(false)}>
                  Back
                </Button>
              </div>
            )}
          </>
        )
      )}
    </Modal>
  );
}
