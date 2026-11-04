import { useEffect, useRef, useState } from "react";
export function useMessageAnnouncement(
  cursor: string,
  author: string,
  loaded: boolean,
  enabled: boolean,
) {
  const previous = useRef<string | undefined>(undefined);
  const [notice, setNotice] = useState({ key: "", text: "" });
  useEffect(() => {
    if (!loaded) return;
    const isNew = previous.current !== undefined && cursor > previous.current;
    if(previous.current===undefined||cursor>previous.current) previous.current = cursor;
    if (!enabled || !isNew) return;
    const timer = setTimeout(
      () => setNotice({ key: cursor, text: `New message from ${author}.` }),
      500,
    );
    return () => clearTimeout(timer);
  }, [cursor, author, loaded, enabled]);
  return enabled ? notice : { key: "", text: "" };
}
