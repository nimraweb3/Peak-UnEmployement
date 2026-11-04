import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ShieldCheck, ArrowUpRight } from "lucide-react";
import { api } from "../lib/api";
import type { Room as RoomType } from "../../shared/types";
import { ChatPanel } from "../components/chat/ChatPanel";
import { Loading, ErrorState } from "../components/common";
import { dailyPrompt } from "../../shared/config";
import { useSession } from "../contexts/session";
export default function Room() {
  const { slug = "lounge" } = useParams();
  const { profile } = useSession();
  const rooms = useQuery({
    queryKey: ["rooms"],
    queryFn: () => api<RoomType[]>("/rooms"),
    staleTime: 300000,
  });
  if (rooms.isLoading) return <Loading />;
  if (rooms.error) return <ErrorState error={rooms.error} />;
  const room = rooms.data?.find((r) => r.slug === slug);
  if (!room)
    return <ErrorState error={new Error("This room does not exist.")} />;
  return (
    <div className="room-layout">
      <section className="room-main">
        <header className="room-header">
          <span className="room-symbol">{room.icon}</span>
          <div>
            <span className="eyebrow">
              {slug === "lounge"
                ? "THE UNEMPLOYMENT LOUNGE"
                : "YOUR INDUSTRY ROOM"}
            </span>
            <h1>{room.name}</h1>
            <p>{room.description}</p>
          </div>
          <span className="room-public">Public room</span>
        </header>
        <ChatPanel key={room.id} id={room.id} kind="rooms" title={room.name} />
      </section>
      <aside className="room-info">
        <div className="prompt-card glass">
          <span className="eyebrow">
            <Sparkles size={15} /> TODAY’S QUESTION
          </span>
          <h3>{dailyPrompt()}</h3>
          <p>A starting point if you need one.</p>
          <span className="prompt-doodle">✳</span>
        </div>
        <div className="room-info-copy">
          <span className="eyebrow">A LITTLE REMINDER</span>
          <h3>This room is public.</h3>
          <p>
            Anyone can read these conversations. Keep identifying details out of
            your posts.
          </p>
        </div>
        <Link to="/community-guidelines" className="guideline-link">
          <ShieldCheck size={20} />
          <div>
            <strong>A few ground rules.</strong>
            <p>Read our community guidelines</p>
          </div>
          <ArrowUpRight size={16} />
        </Link>
        {profile?.industry_id && slug === "lounge" && (
          <Link
            className="suggest-room glass"
            to={`/app/rooms/${profile.industry_id}`}
          >
            YOUR NEXT STOP <strong>Your industry room ↗</strong>
            <p>Same world. Familiar struggles.</p>
          </Link>
        )}
        <p className="info-signoff">
          A place to talk.<span>Peak Unemployment</span>
        </p>
      </aside>
    </div>
  );
}
