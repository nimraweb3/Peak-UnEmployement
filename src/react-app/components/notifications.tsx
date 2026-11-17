import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NavLink, useNavigate } from "react-router";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { api, supabase } from "../lib/api";
import { useSession } from "../contexts/session";
import type { AppNotification } from "../../shared/types";
import { Avatar, Loading, ErrorState, Empty } from "./common";
import { Button } from "./ui/button";
import { PersonDialog } from "./profile/PersonDialog";
import { profileMediaUrl } from "../lib/media";
const Count = createContext(0);
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { profile } = useSession();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: ({ signal }) =>
      api<{ items: AppNotification[]; unread: number }>(
        "/notifications",
        "GET",
        undefined,
        signal,
      ),
    enabled: !!profile,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });
  useEffect(() => {
    if (!supabase || !profile?.id) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
        150,
      );
    };
    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${profile.id}`,
        },
        refresh,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });
    return () => {
      clearTimeout(timer);
      void supabase?.removeChannel(channel);
    };
  }, [profile, qc]);
  return (
    <Count.Provider value={q.data?.unread || 0}>{children}</Count.Provider>
  );
}
export function NotificationBell() {
  const unread = useContext(Count);
  return (
    <NavLink
      to="/app/notifications"
      aria-label={`Notifications, ${unread} unread`}
    >
      <Bell size={20} />
      <span>Notifications</span>
      {unread > 0 && (
        <b className="notification-count" aria-hidden="true">
          {unread > 99 ? "99+" : unread}
        </b>
      )}
    </NavLink>
  );
}
type Preferences = {
  replies: boolean;
  requests: boolean;
  private_messages: boolean;
};
export function NotificationPreferences() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => api<Preferences>("/notifications/preferences"),
  });
  async function change(key: keyof Preferences, value: boolean) {
    if (!q.data) return;
    setBusy(true);
    try {
      await api("/notifications/preferences", "PATCH", {
        ...q.data,
        [key]: value,
      });
      await qc.invalidateQueries({ queryKey: ["notification-preferences"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-section">
      <h2>What reaches you</h2>
      <p>In-app notifications only. No browser permission needed.</p>
      {q.error ? (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      ) : q.data ? (
        (
          [
            ["replies", "Replies to my messages"],
            ["requests", "Private message requests and acceptance"],
            ["private_messages", "Messages in accepted private chats"],
          ] as const
        ).map(([key, label]) => (
          <label className="preference-row" key={key}>
            <span>{label}</span>
            <input
              type="checkbox"
              checked={q.data[key]}
              disabled={busy}
              onChange={(e) => void change(key, e.target.checked)}
            />
          </label>
        ))
      ) : (
        <Loading />
      )}
    </section>
  );
}
export default function Notifications() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [person, setPerson] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: ({ signal }) =>
      api<{ items: AppNotification[]; unread: number }>(
        "/notifications",
        "GET",
        undefined,
        signal,
      ),
  });
  async function read(id: string | null, value = true) {
    await api("/notifications/read", "PATCH", { id, is_read: value });
    await qc.invalidateQueries({ queryKey: ["notifications"] });
  }
  async function open(n: AppNotification) {
    setBusy(true);
    try {
      await read(n.id);
      nav(
        n.conversation_id
          ? `/app/messages/${n.conversation_id}${n.message_id ? `?message=${n.message_id}` : ""}`
          : n.room
            ? `/app/${n.room.slug === "lounge" ? "lounge" : `rooms/${n.room.slug}`}?message=${n.message_id}`
            : "/app/messages",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const labels = {
    reply: "replied to your message",
    request: "sent a private message request",
    accepted: "accepted your message request",
    private_message: "sent you a private message",
  };
  return (
    <div className="content-page notifications-page">
      <header className="page-heading">
        <span className="eyebrow">YOUR CONVERSATIONS, CONTINUED</span>
        <h1>For you.</h1>
        <p>Replies and requests. Nothing from the noise of the whole room.</p>
        <Button
          variant="outline"
          disabled={busy || !q.data?.unread}
          onClick={() => {
            setBusy(true);
            void read(null)
              .catch((e) => toast.error(e.message))
              .finally(() => setBusy(false));
          }}
        >
          Mark all as read
        </Button>
      </header>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      ) : !q.data?.items.length ? (
        <Empty
          title="All quiet for now."
          description="Replies and private conversations will find you here."
        />
      ) : (
        <ol className="notification-list">
          {q.data.items.map((n) => (
            <li key={n.id} className={n.is_read ? "" : "is-unread"}>
              <button
                className="avatar-button"
                aria-label={`View ${n.actor?.username || "member"} profile`}
                onClick={() => setPerson(n.actor_id)}
              >
                <Avatar
                  name={n.actor?.username}
                  seed={n.actor?.avatar_seed}
                  imageSrc={profileMediaUrl(
                    n.actor?.profile_details?.avatar_path,
                  )}
                />
              </button>
              <button
                className="notification-open"
                disabled={busy}
                onClick={() => void open(n)}
              >
                <span>
                  <strong>{n.actor?.username || "A member"}</strong>{" "}
                  {labels[n.type]}
                  {n.room ? ` in ${n.room.name}` : ""}.
                </span>
                <small>
                  <time dateTime={n.created_at}>
                    {new Date(n.created_at).toLocaleString()}
                  </time>{" "}
                  · {n.is_read ? "Read" : "Unread"}
                </small>
              </button>
              <button
                className="text-link"
                disabled={busy}
                aria-label={
                  n.is_read
                    ? "Mark notification unread"
                    : "Mark notification read"
                }
                onClick={() => {
                  setBusy(true);
                  void read(n.id, !n.is_read)
                    .catch((e) => toast.error(e.message))
                    .finally(() => setBusy(false));
                }}
              >
                {n.is_read ? "Unread" : "Read"}
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="fine-print">
        Showing your latest 100 notifications. Opening a message checks access
        again.
      </p>
      <NotificationPreferences />
      {person && <PersonDialog id={person} onClose={() => setPerson(null)} />}
    </div>
  );
}
