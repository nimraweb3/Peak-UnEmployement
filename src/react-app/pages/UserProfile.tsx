import { industries } from "../../shared/config";
import { useSession } from "../contexts/session";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router";
import { useState } from "react";
import { api, supabase } from "../lib/api";
import { Avatar, Loading, ErrorState } from "../components/common";
import { PersonDialog } from "../components/profile/PersonDialog";
import { Button } from "../components/ui/button";
import { Brand } from "../../shared/brand";
import type { Profile } from "../../shared/types";
import type { ProfileDetails, Period } from "../../shared/accounts";
export type PublicProfile = Profile &
  ProfileDetails & {
    employment_status: string | null;
    history: Period[] | null;
  };
export function mediaUrl(path?: string | null) {
  return path && supabase
    ? supabase.storage.from("profile-media").getPublicUrl(path).data.publicUrl
    : undefined;
}
export default function UserProfile() {
  const { session } = useSession();
  const { username } = useParams();
  const [person, setPerson] = useState(false),
    [notice, setNotice] = useState("");
  const q = useQuery({
    queryKey: ["public-profile", username],
    queryFn: () =>
      api<PublicProfile>("/users/" + encodeURIComponent(username || "")),
  });
  return (
    <main className="content-page public-profile-page">
      <Link to="/">
        <Brand />
      </Link>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} />
      ) : (
        q.data && (
          <article className="profile-sheet">
            <div className="profile-banner">
              {q.data.banner_path && (
                <img src={mediaUrl(q.data.banner_path)} alt="" loading="lazy" />
              )}
            </div>
            <div className="profile-sheet-body">
              {q.data.avatar_path ? (
                <img
                  className="profile-photo"
                  src={mediaUrl(q.data.avatar_path)}
                  alt={`${q.data.username}'s avatar`}
                  loading="lazy"
                />
              ) : (
                <Avatar
                  name={q.data.username}
                  seed={q.data.avatar_seed}
                  large
                />
              )}
              <h1>{q.data.display_name || q.data.username}</h1>
              <p>@{q.data.username}</p>
              {q.data.mood && <p className="profile-badge">{q.data.mood}</p>}
              <p>{q.data.public_status}</p>
              <h2>About</h2>
              <p className="profile-bio">{q.data.bio || "No bio yet."}</p>
              <p>
                {q.data.profession}{" "}
                {q.data.industry_id &&
                  "· " +
                    (industries.find((i) => i.slug === q.data?.industry_id)
                      ?.name || q.data.industry_id)}
              </p>
              <p>
                Joined{" "}
                {new Date(q.data.created_at).toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </p>
              {q.data.employment_status && <p>{q.data.employment_status}</p>}
              {q.data.history?.map((p, i) => (
                <p key={i}>
                  {p.start_month.slice(0, 7)} —{" "}
                  {p.end_month?.slice(0, 7) || "Present"} {p.note}
                </p>
              ))}
              <div className="profile-actions">
                {!session && <Link to="/auth">Sign in to ask to chat</Link>}
                <Button disabled={!session} onClick={() => setPerson(true)}>
                  Chat & safety options
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(location.origin + "/u/" + q.data.username)
                      .then(() => setNotice("Profile link copied."))
                      .catch(() =>
                        setNotice(
                          "Couldn’t copy. You can copy the address from your browser.",
                        ),
                      )
                  }
                >
                  Copy profile link
                </Button>
              </div>
              {notice && <p role="status">{notice}</p>}
            </div>
          </article>
        )
      )}
      {person && q.data && (
        <PersonDialog id={q.data.id} onClose={() => setPerson(false)} />
      )}
    </main>
  );
}
