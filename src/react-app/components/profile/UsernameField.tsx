import { useEffect, useState } from "react";
import { api, frontendDemo } from "../../lib/api";
import { usernameSchema } from "../../../shared/accounts";
import { useSession } from "../../contexts/session";
export function UsernameField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { session, profile } = useSession();
  const [result, setResult] = useState<{
      username: string;
      valid: boolean;
      available: boolean;
      suggestions: string[];
    } | null>(null),
    [error, setError] = useState(""),
    [checking, setChecking] = useState(false);
  useEffect(() => {
    let active = true;
    setResult(null);
    setError("");
    setChecking(false);
    if (!session || !profile || frontendDemo) return;
    if (!usernameSchema.safeParse(value).success) {
      setError(
        "Use 3–20 lowercase letters, numbers, or underscores. Reserved names aren’t available.",
      );
      return;
    }
    setChecking(true);
    const timer = setTimeout(() => {
      void api<{
        username: string;
        valid: boolean;
        available: boolean;
        suggestions: string[];
      }>("/usernames/availability?username=" + encodeURIComponent(value))
        .then((data) => {
          if (active) setResult(data);
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setChecking(false);
        });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [value, session, profile]);
  return (
    <div className="username-field">
      <label>
        Username
        <input
          value={value}
          maxLength={20}
          autoComplete="username"
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          aria-describedby="username-feedback"
        />
      </label>
      <p id="username-feedback" role="status" className="fine-print">
        {checking
          ? "Checking availability…"
          : error ||
            (!session
              ? "Availability is checked after you join."
              : frontendDemo
                ? "Local preview. Availability is not checked against real accounts."
                : result
                  ? result.available
                    ? `${result.username} is available.`
                    : result.valid
                      ? `${result.username} is already taken.`
                      : "This username isn’t available."
                  : "")}
      </p>
      {result?.suggestions.map((s) => (
        <button
          type="button"
          className="button button-outline"
          key={s}
          onClick={() => onChange(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
