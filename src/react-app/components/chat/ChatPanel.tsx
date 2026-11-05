import { useMessageAnnouncement } from "../../hooks/useMessageAnnouncement";
import { useState, useRef, useLayoutEffect, useEffect } from "react";
import {
  ArrowDown,
  Send,
  MoreHorizontal,
  Trash2,
  SmilePlus,
  RotateCcw,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMessages } from "../../hooks/useMessages";
import { useSession } from "../../contexts/session";
import { usePreferences } from "../../contexts/preferences";
import { api } from "../../lib/api";
import { timeLabel } from "../../lib/utils";
import { Button } from "../ui/button";
import { Avatar, Empty, ErrorState, Loading } from "../common";
import { PersonDialog } from "../profile/PersonDialog";
import { motion } from "motion/react";
type Pending = { client_id: string; content: string; failed: boolean };
type ChatProps = {
  id: string;
  kind: "rooms" | "conversations";
  title: string;
  closed?: boolean;
};
export function ChatPanel(props: ChatProps) {
  const { profile } = useSession();
  return <ChatContent key={profile?.id || "guest"} {...props} />;
}
function ChatContent({ id, kind, title, closed = false }: ChatProps) {
  const { profile } = useSession();
  const { reduced, announcements } = usePreferences();
  const qc = useQueryClient();
  const query = useMessages(kind, id);
  const [content, setContent] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [unseen, setUnseen] = useState(false);
  const [person, setPerson] = useState<{
    id: string;
    messageId?: string;
  } | null>(null);
  const [reactionMenu, setReactionMenu] = useState<string | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const previousLast = useRef("");
  const olderHeight = useRef<{ height: number; pages: number } | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const lastRow = query.messages.at(-1);
  const latestMessage = lastRow?.id;
  const announcement = useMessageAnnouncement(
    lastRow ? `${lastRow.created_at}:${lastRow.id}` : "",
    lastRow?.profiles?.username || "a member",
    !query.isLoading && !query.error,
    announcements,
  );
  useEffect(() => {
    if (kind !== "conversations" || !latestMessage || !atBottom) return;
    const mark = () => {
      if (document.hidden) return;
      void api(`/conversations/${id}`, "PATCH", { action: "read" })
        .then(() => qc.invalidateQueries({ queryKey: ["conversations"] }))
        .catch(() => {});
    };
    const timer = setTimeout(mark, 500);
    document.addEventListener("visibilitychange", mark);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", mark);
    };
  }, [kind, id, latestMessage, atBottom, qc]);
  useLayoutEffect(() => {
    const el = scroll.current;
    if (!el) return;
    if (olderHeight.current !== null) {
      if ((query.data?.pages.length || 0) > olderHeight.current.pages) {
        el.scrollTop += el.scrollHeight - olderHeight.current.height;
        olderHeight.current = null;
      } else if (query.isFetchNextPageError) olderHeight.current = null;
      return;
    }
    const last = query.messages.at(-1)?.id || "";
    if (last !== previousLast.current) {
      if (nearBottom.current) el.scrollTop = el.scrollHeight;
      else if (previousLast.current) setUnseen(true);
      previousLast.current = last;
    }
  }, [query.messages, query.data, query.isFetchNextPageError]);
  async function send(item?: Pending) {
    if (sendingRef.current) return;
    const text = (item?.content || content).trim();
    if (!text || text.length > 1000) return;
    const row = item || {
      client_id: crypto.randomUUID(),
      content: text,
      failed: false,
    };
    sendingRef.current = true;
    setSending(true);
    if (!item) {
      setPending((p) => [...p, row]);
      setContent("");
    } else
      setPending((p) =>
        p.map((x) =>
          x.client_id === row.client_id ? { ...x, failed: false } : x,
        ),
      );
    try {
      await api(`/${kind}/${id}/messages`, "POST", {
        content: row.content,
        client_id: row.client_id,
      });
      await qc.invalidateQueries({ queryKey: ["messages", kind, id] });
      setPending((p) => p.filter((x) => x.client_id !== row.client_id));
      nearBottom.current = true;
      if (scroll.current)
        scroll.current.scrollTop = scroll.current.scrollHeight;
    } catch (e) {
      setPending((p) =>
        p.map((x) =>
          x.client_id === row.client_id ? { ...x, failed: true } : x,
        ),
      );
      toast.error((e as Error).message);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }
  async function remove(mid: string) {
    try {
      await api(`/messages/${mid}`, "DELETE");
      await qc.invalidateQueries({ queryKey: ["messages", kind, id] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function react(mid: string, emoji: string, active: boolean) {
    try {
      await api(`/messages/${mid}/reactions`, active ? "DELETE" : "POST", {
        emoji,
      });
      setReactionMenu(null);
      await qc.invalidateQueries({ queryKey: ["messages", kind, id] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <div className="chat-panel">
      <div className="chat-connection">
        <span
          className={
            query.connection === "Live" ? "status-dot" : "status-dot amber"
          }
        />
        {query.connection === "Live"
          ? "Connected to the conversation"
          : query.connection === "Offline"
            ? "You’re offline. Messages will need retrying."
            : `${query.connection}…`}
        <span>KEEP IT KIND.</span>
      </div>
      <div
        className="message-scroll"
        ref={scroll}
        onScroll={() => {
          const el = scroll.current;
          if (el) {
            nearBottom.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 120;
            setAtBottom(nearBottom.current);
            if (nearBottom.current) setUnseen(false);
          }
        }}
        aria-label={`${title} messages`}
        role="region"
        tabIndex={0}
      >
        {query.hasNextPage && (
          <Button
            variant="ghost"
            size="sm"
            className="load-older"
            disabled={query.isFetchingNextPage}
            onClick={() => {
              olderHeight.current = {
                height: scroll.current?.scrollHeight || 0,
                pages: query.data?.pages.length || 0,
              };
              void query.fetchNextPage();
            }}
          >
            {query.isFetchingNextPage ? "Loading…" : "Load older messages"}
          </Button>
        )}
        {query.isLoading ? (
          <Loading />
        ) : query.error ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : query.messages.length === 0 ? (
          <Empty
            title="Quiet in here. Someone has to start."
            description="A question, a small win, or whatever’s on your mind."
          />
        ) : null}
        {query.messages.map((message) => {
          const own = message.sender_id === profile?.id;
          const reactions = message.reactions || [];
          const emojis = [...new Set(reactions.map((r) => r.emoji))];
          return (
            <motion.article
              initial={reduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`message ${own ? "message-own" : ""}`}
              key={message.id}
            >
              <button
                className="avatar-button"
                disabled={own}
                aria-label={`View ${message.profiles?.username || "anonymous"} profile`}
                onClick={() => setPerson({ id: message.sender_id })}
              >
                <Avatar
                  seed={message.profiles?.avatar_seed}
                  name={message.profiles?.username}
                />
              </button>
              <div className="message-body">
                <div className="message-meta">
                  <button
                    disabled={own}
                    onClick={() => setPerson({ id: message.sender_id })}
                  >
                    {message.profiles?.username || "Anonymous"}
                  </button>
                  {own && <span className="you-tag">you</span>}
                  <time dateTime={message.created_at}>
                    {timeLabel(message.created_at)}
                  </time>
                </div>
                <p className={message.deleted_at ? "removed" : ""}>
                  {message.deleted_at
                    ? "This message was removed."
                    : message.content}
                </p>
                {!message.deleted_at && (
                  <div className="reactions">
                    {emojis.map((emoji) => {
                      const active = reactions.some(
                        (r) => r.user_id === profile?.id && r.emoji === emoji,
                      );
                      return (
                        <button
                          key={emoji}
                          className={`reaction ${active ? "reacted" : ""}`}
                          aria-pressed={active}
                          onClick={() => void react(message.id, emoji, active)}
                        >
                          {emoji}{" "}
                          {reactions.filter((r) => r.emoji === emoji).length}
                        </button>
                      );
                    })}
                  </div>
                )}
                {reactionMenu === message.id && (
                  <div
                    className="emoji-picker"
                    role="group"
                    aria-label="Choose reaction"
                  >
                    {["💜", "😂", "🫂", "🎉", "🔥"].map((emoji) => (
                      <button
                        key={emoji}
                        aria-label={`React ${emoji}`}
                        onClick={() =>
                          void react(
                            message.id,
                            emoji,
                            reactions.some(
                              (r) =>
                                r.user_id === profile?.id && r.emoji === emoji,
                            ),
                          )
                        }
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      onClick={() => setReactionMenu(null)}
                      aria-label="Close reactions"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              {!message.deleted_at && (
                <div className="message-actions">
                  <button
                    className="icon-button"
                    aria-label="Add reaction"
                    onClick={() =>
                      setReactionMenu(
                        reactionMenu === message.id ? null : message.id,
                      )
                    }
                  >
                    <SmilePlus size={15} />
                  </button>
                  {own ? (
                    <button
                      className="icon-button"
                      aria-label="Delete message"
                      onClick={() => void remove(message.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : (
                    <button
                      className="icon-button"
                      aria-label="Report or block sender"
                      onClick={() =>
                        setPerson({
                          id: message.sender_id,
                          messageId: message.id,
                        })
                      }
                    >
                      <MoreHorizontal size={17} />
                    </button>
                  )}
                </div>
              )}
            </motion.article>
          );
        })}
        {pending
          .filter(
            (p) => !query.messages.some((m) => m.client_id === p.client_id),
          )
          .map((item) => (
            <div className="pending-message" key={item.client_id}>
              <p>{item.content}</p>
              <small>{item.failed ? "Failed to send" : "Sending…"}</small>
              {item.failed && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={sending}
                    onClick={() => void send(item)}
                  >
                    <RotateCcw size={14} />
                    Retry
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setContent(item.content);
                      setPending((p) =>
                        p.filter((x) => x.client_id !== item.client_id),
                      );
                    }}
                  >
                    Edit
                  </Button>
                </>
              )}
            </div>
          ))}
      </div>
      {unseen && (
        <button
          className="new-messages"
          onClick={() => {
            if (scroll.current)
              scroll.current.scrollTop = scroll.current.scrollHeight;
            setUnseen(false);
            nearBottom.current = true;
          }}
        >
          New messages <ArrowDown size={15} />
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
      <form
        className="composer-area"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <div className="composer">
          <textarea
            aria-label="Message"
            placeholder={
              closed ? "This conversation is closed." : "Say something…"
            }
            value={content}
            maxLength={1000}
            rows={1}
            disabled={closed}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button
            size="icon"
            type="submit"
            disabled={closed || sending || !content.trim()}
            aria-label="Send message"
          >
            <Send size={19} />
          </Button>
        </div>
        <div className="composer-footer">
          <span>↵ to send · shift + ↵ for a new line</span>
          <span>
            {content.length > 800
              ? `${content.length}/1000`
              : kind === "rooms"
                ? "Public posts are visible to visitors."
                : "Private conversation"}
          </span>
        </div>
      </form>
      {person && (
        <PersonDialog
          id={person.id}
          messageId={person.messageId}
          onClose={() => setPerson(null)}
        />
      )}
    </div>
  );
}
