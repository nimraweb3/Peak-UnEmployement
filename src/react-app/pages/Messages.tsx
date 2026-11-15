import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle, ArrowLeft, MoreHorizontal } from "lucide-react";
import { api, supabase, demoMode, frontendDemo } from "../lib/api";
import { useSession } from "../contexts/session";
import type { Conversation, Request } from "../../shared/types";
import { Button } from "../components/ui/button";
import { Avatar, Loading, ErrorState, Empty } from "../components/common";
import { ChatPanel } from "../components/chat/ChatPanel";
import { PersonDialog } from "../components/profile/PersonDialog";
export default function Messages() {
  const { conversationId } = useParams();
  const { profile } = useSession();
  const qc = useQueryClient();
  const [person, setPerson] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requests = useQuery({
    queryKey: ["requests"],
    refetchInterval: demoMode ? 2000 : 30000,
    refetchIntervalInBackground: false,
    queryFn: ({ signal }) => api<Request[]>("/dm-requests", "GET", undefined, signal),
  });
  const conversations = useQuery({
    queryKey: ["conversations"],
    refetchInterval: demoMode ? 2000 : 30000,
    refetchIntervalInBackground: false,
    queryFn: ({ signal }) => api<Conversation[]>("/conversations", "GET", undefined, signal),
  });
  useEffect(() => {
    if (!supabase || !profile) return;
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: ["requests"] });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    };
    const ch = supabase
      .channel(`inbox:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dm_requests",
          filter: `recipient_id=eq.${profile.id}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dm_requests",
          filter: `sender_id=eq.${profile.id}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `user_a=eq.${profile.id}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `user_b=eq.${profile.id}`,
        },
        refresh,
      )
      .subscribe();
    return () => {
      void supabase?.removeChannel(ch);
    };
  }, [profile, qc]);
  async function respond(id: string, status: string) {
    setBusy(true);
    try {
      await api(`/dm-requests/${id}`, "PATCH", { status });
      await qc.invalidateQueries({ queryKey: ["requests"] });
      await qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(
        status === "accepted" ? "Request accepted." : "Request declined.",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const selected = conversations.data?.find((c) => c.id === conversationId);
  const other = selected
    ? selected.user_a === profile?.id
      ? selected.b
      : selected.a
    : null;
  if (conversationId) {
    if (conversations.isLoading) return <Loading />;
    if (conversations.error) return <ErrorState error={conversations.error} />;
    if (!selected)
      return (
        <ErrorState
          error={
            new Error(
              "This conversation is unavailable. It may be blocked or belong to someone else.",
            )
          }
        />
      );
    return (
      <div className="private-chat">
        <header className="room-header">
          <Link
            className="icon-button"
            to="/app/messages"
            aria-label="Back to conversations"
          >
            <ArrowLeft />
          </Link>
          <Avatar name={other?.username} seed={other?.avatar_seed} />
          <div>
            <span className="eyebrow">PRIVATE CHAT</span>
            <h1>{other?.username}</h1>
            <p>
              {selected.closed_at
                ? "Closed — history remains available"
                : "Private chat. Keep personal details private."}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Private conversation options"
            onClick={() => setPerson(other?.id || null)}
          >
            <MoreHorizontal />
          </Button>
          {!selected.closed_at && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api(`/conversations/${selected.id}`, "PATCH", {
                    action: "close",
                  });
                  await qc.invalidateQueries({ queryKey: ["conversations"] });
                  toast.success("Conversation closed for both participants.");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Close chat
            </Button>
          )}
        </header>
        <ChatPanel
          key={selected.id}
          id={selected.id}
          kind="conversations"
          title={other?.username || "Private chat"}
          closed={!!selected.closed_at}
        />
        {person && <PersonDialog id={person} onClose={() => setPerson(null)} />}
      </div>
    );
  }
  const incoming =
    requests.data?.filter(
      (r) => r.recipient_id === profile?.id && r.status === "pending",
    ) || [];
  const outgoing =
    requests.data?.filter((r) => r.sender_id === profile?.id) || [];
  return (
    <div className="content-page">
      <span className="eyebrow">YOUR INBOX</span>
      <h1>Messages</h1>
      <p className="page-intro">
        Private conversations start with an accepted request.
      </p>
      {frontendDemo && (
        <div className="notice">
          <p>
            Frontend demo. No real people receive these messages. Enable
            requests in Settings, then try an incoming request.
          </p>
          <Button
            variant="outline"
            disabled={!profile?.allows_dm_requests}
            onClick={async () => {
              try {
                await api("/demo/incoming", "POST");
                await qc.invalidateQueries({ queryKey: ["requests"] });
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            Preview incoming request
          </Button>
        </div>
      )}
      <div className="notice">
        <MessageCircle />
        <p>
          Message requests are{" "}
          <strong>{profile?.allows_dm_requests ? "enabled" : "off"}</strong>.{" "}
          {profile?.allows_dm_requests
            ? "People can request a chat. You decide who gets in."
            : "You can turn them on in Settings."}{" "}
          <Link to="/app/settings">Manage preferences ↗</Link>
        </p>
      </div>
      {requests.isLoading || conversations.isLoading ? (
        <Loading />
      ) : requests.error || conversations.error ? (
        <ErrorState error={requests.error || conversations.error} />
      ) : (
        <>
          <section className="inbox-section">
            <h2>
              Requests <span>{incoming.length}</span>
            </h2>
            {incoming.length ? (
              incoming.map((r) => (
                <article className="inbox-row glass" key={r.id}>
                  <Avatar
                    name={r.sender.username}
                    seed={r.sender.avatar_seed}
                  />
                  <button
                    className="inbox-person"
                    onClick={() => setPerson(r.sender_id)}
                  >
                    <strong>{r.sender.username}</strong>
                    <small>Wants to chat privately</small>
                  </button>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void respond(r.id, "accepted")}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void respond(r.id, "declined")}
                  >
                    Decline
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPerson(r.sender_id)}
                  >
                    Block / report
                  </Button>
                </article>
              ))
            ) : (
              <p className="muted">No message requests right now.</p>
            )}
          </section>
          <section className="inbox-section">
            <h2>Your conversations</h2>
            {conversations.data?.length ? (
              conversations.data.map((c) => {
                const user = c.user_a === profile?.id ? c.b : c.a;
                return (
                  <Link
                    key={c.id}
                    className="inbox-row glass"
                    to={`/app/messages/${c.id}`}
                  >
                    <Avatar name={user.username} seed={user.avatar_seed} />
                    <div className="inbox-person">
                      <strong>{user.username}</strong>
                      <small>
                        {c.closed_at
                          ? "Closed conversation"
                          : "Pick up where you left off"}
                      </small>
                    </div>
                    {c.unread > 0 && (
                      <span className="unread-badge">{c.unread} new</span>
                    )}
                    <span>↗</span>
                  </Link>
                );
              })
            ) : (
              <Empty
                title="Nothing here yet."
                description="Meet someone in a room, then ask to chat privately. They decide whether to accept."
              />
            )}
          </section>
          {outgoing.length > 0 && (
            <section className="inbox-section">
              <h2>Sent requests</h2>
              {outgoing.map((r) => (
                <div className="inbox-row" key={r.id}>
                  <span>{r.recipient.username}</span>
                  <small>{r.status}</small>
                </div>
              ))}
            </section>
          )}
        </>
      )}
      {person && <PersonDialog id={person} onClose={() => setPerson(null)} />}
    </div>
  );
}
