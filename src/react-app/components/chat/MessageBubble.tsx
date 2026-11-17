import type { ReactNode } from "react";
/** Visual primitive only: demo and production data never share an adapter. */
export function MessageBubble({
  children,
  deleted = false,
}: {
  children: ReactNode;
  deleted?: boolean;
}) {
  return (
    <p className={`message-bubble ${deleted ? "removed" : ""}`}>
      {deleted ? "This message was removed." : children}
    </p>
  );
}
