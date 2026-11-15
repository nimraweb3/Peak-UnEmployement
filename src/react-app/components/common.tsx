import { LoaderCircle, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
export function Avatar({
  imageSrc,
  seed = "peak",
  name = "Anonymous",
  large = false,
}: {
  imageSrc?: string;
  seed?: string;
  name?: string;
  large?: boolean;
}) {
  if (imageSrc) return <img className={`avatar ${large ? "avatar-large" : ""}`} src={imageSrc} alt={`${name}’s avatar`} loading="lazy" style={{objectFit:"cover"}}/>;
  const hue = [...seed].reduce((n, c) => n + c.charCodeAt(0), 0) % 4;
  return (
    <span
      className={`avatar ${large ? "avatar-large" : ""}`}
      style={{
        background: `var(--avatar-${hue})`,
        color: "var(--avatar-ink)",
      }}
      aria-label={`${name}'s avatar`}
      role="img"
    >
      {Array.from(name)[0]?.toUpperCase()}
      <i />
    </span>
  );
}
export function Loading() {
  return (
    <div className="state" role="status" aria-live="polite">
      <LoaderCircle className="spin" aria-hidden="true" />
      <p>Loading…</p>
      <div className="skeleton-lines" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="state" role="alert">
      <AlertCircle />
      <p>
        {error instanceof Error
          ? error.message
          : "Something went wrong. Try again."}
      </p>
      {retry && (
        <Button variant="outline" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="state empty">
      <span className="empty-icon">
        <Sparkles />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
