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
                ? "THE HEART OF THE CHAOS"
                : "DIFFERENT INDUSTRY. SAME STRUGGLE."}
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
            <Sparkles size={15} /> THE DAILY RANT
          </span>
          <h3>{dailyPrompt()}</h3>
          <p>
            No wrong answers.
            <br />
            Some very funny ones, probably.
          </p>
          <span className="prompt-doodle">✳</span>
        </div>
        <div className="room-info-copy">
          <span className="eyebrow">A LITTLE REMINDER</span>
          <h3>
            You’re more than
            <br />
            your employment status.
          </h3>
          <p>
            Rant a little. Celebrate a little. Take a break when you need one.
          </p>
        </div>
        <Link to="/community-guidelines" className="guideline-link">
          <ShieldCheck size={20} />
          <div>
            <strong>Good company, good boundaries.</strong>
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
          unemployed, but never alone.<span>peak.</span>
        </p>
      </aside>
    </div>
  );
}
