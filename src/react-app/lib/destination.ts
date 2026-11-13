import { industries } from "../../shared/config";

/** Convert public room intent into an allowlisted authenticated destination. */
export function appDestination(value: string | null): string {
  if (!value || value === "/") return "/app/lounge";
  if (
    ["/app/lounge", "/app/settings", "/app/messages", "/app/profile"].includes(
      value,
    )
  )
    return value;
  const slug = value.match(/^\/(?:app\/)?rooms\/([a-z-]+)$/)?.[1];
  return slug && industries.some((room) => room.slug === slug)
    ? `/app/rooms/${slug}`
    : "/app/lounge";
}
