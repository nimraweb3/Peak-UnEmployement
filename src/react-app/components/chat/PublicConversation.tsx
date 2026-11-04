import { useMessageAnnouncement } from "../../hooks/useMessageAnnouncement";
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUpRight, RefreshCw, WifiOff } from "lucide-react";
import { Avatar, ErrorState, Loading } from "../common";
import { Button } from "../ui/button";
import { BrandMark } from "../../../shared/brand";
import { GuestPlaceholder } from "../../../shared/public-page";
import { api } from "../../lib/api";
import { useSession } from "../../contexts/session";
import { usePreferences } from "../../contexts/preferences";
import { timeLabel } from "../../lib/utils";
import type { Room } from "../../../shared/types";
const ChatPanel = lazy(() =>
  import("./ChatPanel").then((m) => ({ default: m.ChatPanel })),
);
export interface GuestMessage {
  id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
  author: { username: string; avatar_seed: string };
  reactions: { emoji: string; count: number }[];
}
interface Feed {
  room: { id: string; name: string; slug: string };
  items: GuestMessage[];
  next: string | null;
}
export function PublicConversation({
  slug,
  onJoin,
}: {
  slug: string;
  onJoin: () => void;
}) {
  const { profile } = useSession();
  return profile?.onboarding_completed ? (
    <Suspense fallback={<GuestPlaceholder />}>
      <MemberRoom slug={slug} />
    </Suspense>
  ) : (
    <GuestFeed key={slug} slug={slug} onJoin={onJoin} />
  );
}
function MemberRoom({ slug }: { slug: string }) {
  const rooms = useQuery({
    queryKey: ["rooms"],
    queryFn: () => api<Room[]>("/rooms"),
    staleTime: 300000,
  });
  const room = rooms.data?.find((r) => r.slug === slug);
  if (rooms.isLoading) return <Loading />;
  if (rooms.error) return <ErrorState error={rooms.error} />;
  return room ? (
    <ChatPanel key={room.id} id={room.id} kind="rooms" title={room.name} />
  ) : (
    <ErrorState error={new Error("This room does not exist.")} />
  );
}
function GuestFeed({ slug, onJoin }: { slug: string; onJoin: () => void }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [visible, setVisible] = useState(!document.hidden);
  const [unseen, setUnseen] = useState(false);
  const { announcements } = usePreferences();
  const scroll = useRef<HTMLDivElement>(null);
  const bottom = useRef(true);
  const newest = useRef("");
  const previousHeight = useRef<{ height: number; pages: number } | null>(null);
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      setVisible(!document.hidden);
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const query = useInfiniteQuery({
    queryKey: ["public-feed", slug],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      const response = await fetch(
        `/api/public/rooms/${slug}/messages${pageParam ? `?before=${encodeURIComponent(pageParam)}` : ""}`,
        { signal },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "Couldn’t load the conversation. Try again.",
        );
      return data as Feed;
    },
    getNextPageParam: (page, pages) => (pages.length < 4 ? page.next : null),
    refetchInterval: visible && online ? 15000 : false,
    refetchIntervalInBackground: false,
    retry: 1,
    staleTime: 10000,
  });
  const items = [
    ...new Map(
      query.data?.pages.flatMap((p) => p.items).map((m) => [m.id, m]) || [],
    ).values(),
  ].sort(
    (a, b) =>
      a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
  const lastRow = items.at(-1);
  const last = lastRow?.id || "";
  const announcement = useMessageAnnouncement(
    lastRow ? `${lastRow.created_at}:${lastRow.id}` : "",
    lastRow?.author.username || "a member",
    query.isSuccess,
    announcements,
  );
  useLayoutEffect(() => {
    const el = scroll.current;
    if (!el) return;
    if (previousHeight.current) {
      if ((query.data?.pages.length || 0) > previousHeight.current.pages) {
        el.scrollTop += el.scrollHeight - previousHeight.current.height;
        previousHeight.current = null;
      } else if (query.isFetchNextPageError) previousHeight.current = null;
      return;
    }
    if (newest.current !== last) {
      if (bottom.current) el.scrollTop = el.scrollHeight;
      else if (newest.current) setUnseen(true);
      newest.current = last;
    }
  }, [last, query.data, query.isFetchNextPageError]);
  const status = !online
    ? "Offline"
    : query.error
      ? "Not connected"
      : query.isPending
        ? "Connecting…"
        : query.isFetching
          ? "Refreshing…"
          : "Auto-refresh · every 15s";
  return (
    <>
      <div className="feed-status">
        <span
          className={`connection-dot ${query.error || !online ? "disconnected" : ""}`}
          aria-hidden="true"
        />
        {status}
        <span className="guest-label">YOU’RE READING AS A GUEST</span>
      </div>
      <div
        className="guest-message-scroll"
        ref={scroll}
        onScroll={() => {
          if (scroll.current) {
            bottom.current =
              scroll.current.scrollHeight -
                scroll.current.scrollTop -
                scroll.current.clientHeight <
              90;
            if (bottom.current) setUnseen(false);
          }
        }}
        tabIndex={0}
        aria-label="Public message history"
      >
        {query.isPending ? (
          <GuestPlaceholder />
        ) : query.error ? (
          <div className="feed-empty">
            <div className="empty-mark">
              <WifiOff size={28} />
            </div>
            <h3>Conversation on hold.</h3>
            <p>{query.error.message}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
            >
              <RefreshCw size={15} />
              Try again
            </Button>
            <span className="empty-footnote">
              No sample messages. This is where the real ones go.
            </span>
          </div>
        ) : items.length === 0 ? (
          <div className="feed-empty">
            <div className="empty-mark">
              <BrandMark />
            </div>
            <h3>
              Quiet in here.
              <br />
              Someone has to start.
            </h3>
            <p>
              A question, a small win, a very strange interview.
              <br />
              Whatever’s on your mind.
            </p>
            <Button variant="outline" onClick={onJoin}>
              Join anonymously <ArrowUpRight size={16} />
            </Button>
            <span className="empty-footnote">No introductions required.</span>
          </div>
        ) : (
          <>
            {query.hasNextPage && (
              <Button
                size="sm"
                variant="ghost"
                className="load-older"
                disabled={query.isFetchingNextPage}
                onClick={() => {
                  previousHeight.current = {
                    height: scroll.current?.scrollHeight || 0,
                    pages: query.data?.pages.length || 0,
                  };
                  void query.fetchNextPage();
                }}
              >
                Load older messages
              </Button>
            )}
            <ol className="guest-message-list" aria-label="Messages">
              {items.map((message) => (
                <li className="public-message" key={message.id}>
                  <Avatar
                    name={message.author.username}
                    seed={message.author.avatar_seed}
                  />
                  <div>
                    <div className="message-meta">
                      <strong>{message.author.username}</strong>
                      <time dateTime={message.created_at}>
                        {timeLabel(message.created_at)}
                      </time>
                    </div>
                    <p className={message.deleted_at ? "removed" : ""}>
                      {message.deleted_at
                        ? "Message removed."
                        : message.content}
                    </p>
                    {!message.deleted_at && message.reactions.length > 0 && (
                      <div className="reactions">
                        {message.reactions.map((r) => (
                          <button
                            className="reaction"
                            key={r.emoji}
                            aria-label={`Join to react ${r.emoji}, ${r.count} reactions`}
                            onClick={onJoin}
                          >
                            {r.emoji} {r.count}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
      {unseen && (
        <button
          className="guest-new"
          onClick={() => {
            if (scroll.current)
              scroll.current.scrollTop = scroll.current.scrollHeight;
            setUnseen(false);
            bottom.current = true;
          }}
        >
          New messages <ArrowDown size={14} />
        </button>
      )}
      <div
        className="sr-only"
        role="status"
        aria-live={announcements ? "polite" : "off"}
      >
        <span key={announcement.key}>
          {announcement.text}
          {announcement.text && unseen
            ? " Use the new messages button to read it."
            : ""}
        </span>
      </div>
      <div className="guest-composer">
        <span>Join to send a message</span>
        <Button onClick={onJoin}>
          Join in <ArrowUpRight size={16} />
        </Button>
      </div>
      <p className="public-disclosure">
        Public room · Anyone can read. Members can reply.
      </p>
    </>
  );
}
