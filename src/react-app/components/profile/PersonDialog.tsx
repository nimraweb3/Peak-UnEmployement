import { profileMediaUrl } from "../../lib/media";
import { Link } from "react-router";
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
  const details = useQuery({
    queryKey: ["public-profile", profile.data?.username],
    queryFn: () =>
      api<{
        display_name: string;
        bio: string;
        mood: string;
        avatar_path: string | null;
        banner_path: string | null;
      }>("/users/" + profile.data!.username),
    enabled: !!profile.data,
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
      title={report ? "Report to moderators" : "Profile"}
      description={
        report
          ? "Reports are private. Include context without personal information."
          : "Choose whether to ask for a private chat, report, or block."
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
              {details.data?.banner_path && (
                <img
                  className="compact-banner"
                  src={profileMediaUrl(details.data.banner_path)}
                  alt=""
                  loading="lazy"
                />
              )}
              <Avatar
                imageSrc={profileMediaUrl(details.data?.avatar_path)}
                seed={profile.data.avatar_seed}
                name={profile.data.username}
                large
              />
              <h3>{details.data?.display_name || profile.data.username}</h3>
              <p>@{profile.data.username}</p>
              {details.data?.mood && <p>{details.data.mood}</p>}
              {details.data?.bio && <p>{details.data.bio}</p>}
              <Link to={"/u/" + profile.data.username} onClick={onClose}>
                Open full profile ↗
              </Link>
              <p>{profile.data.public_status || "No status shared."}</p>
              <small>
                {profile.data.profession ||
                  profile.data.industry_id ||
                  "Industry not shared"}
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
                        "Request sent. They can accept or decline.",
                      )
                    }
                  >
                    Ask to chat
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
                      "Report received. Thanks for letting us know.",
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
