import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { api, supabase } from "../lib/api";
import type { Message } from "../../shared/types";
export function useMessages(kind: "rooms" | "conversations", id: string) {
  const qc = useQueryClient();
  const [connection, setConnection] = useState("Connecting");
  const query = useInfiniteQuery({
    queryKey: ["messages", kind, id],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api<{ items: Message[]; next: string | null }>(
        `/${kind}/${id}/messages${pageParam ? `?before=${encodeURIComponent(pageParam)}` : ""}`,
      ),
    getNextPageParam: (page, pages) => (pages.length < 10 ? page.next : null),
    enabled: !!id,
  });
  useEffect(() => {
    if (!supabase || !id) return;
    const field = kind === "rooms" ? "room_id" : "conversation_id";
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void qc.invalidateQueries({ queryKey: ["messages", kind, id] });
      }, 200);
    };
    const channel = supabase
      .channel(`messages:${kind}:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `${field}=eq.${id}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `${field}=eq.${id}`,
        },
        refresh,
      )
      .subscribe((status) => {
        setConnection(
          status === "SUBSCRIBED"
            ? "Live"
            : status === "CHANNEL_ERROR" || status === "TIMED_OUT"
              ? "Reconnecting"
              : "Connecting",
        );
        if (status === "SUBSCRIBED")
          void qc.invalidateQueries({ queryKey: ["messages", kind, id] });
      });
    const online = () => {
      void qc.invalidateQueries({ queryKey: ["messages", kind, id] });
    };
    const offline = () => setConnection("Offline");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      clearTimeout(refreshTimer);
      void supabase?.removeChannel(channel);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [id, kind, qc]);
  const messages = useMemo(() => {
    const unique = new Map<string, Message>();
    query.data?.pages.forEach((page) =>
      page.items.forEach((item) => unique.set(item.id, item)),
    );
    return [...unique.values()].sort(
      (a, b) =>
        a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
    );
  }, [query.data]);
  return { ...query, messages, connection };
}
