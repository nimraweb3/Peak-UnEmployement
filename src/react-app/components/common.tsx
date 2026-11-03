import { LoaderCircle, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
export function Avatar({
  seed = "peak",
  name = "Anonymous",
  large = false,
}: {
  seed?: string;
  name?: string;
  large?: boolean;
}) {
  const hue = [...seed].reduce((n, c) => n + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className={`avatar ${large ? "avatar-large" : ""}`}
      style={{
        background: `linear-gradient(140deg,hsl(${hue} 65% 65%),hsl(${(hue + 70) % 360} 55% 34%))`,
      }}
      aria-label={`${name}'s avatar`}
    >
      {Array.from(name)[0]?.toUpperCase()}
      <i />
    </span>
  );
}
export function Loading() {
  return (
    <div className="state">
      <LoaderCircle className="spin" />
      <p>Waiting for a response… just like your applications.</p>
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
          : "Something went wrong. At least it’s not another rejection."}
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
