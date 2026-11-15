import { requestJson } from "./transport";
import { createClient } from "@supabase/supabase-js";
export const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const demoMode = import.meta.env.DEV && import.meta.env.MODE === "demo";
export const configured = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);
export const frontendDemo =
  import.meta.env.DEV &&
  !configured &&
  !demoMode &&
  import.meta.env.VITE_FRONTEND_DEMO === "true";
export const supabase =
  configured && !demoMode
    ? createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        { auth: { flowType: "pkce" } },
      )
    : null;
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  if (frontendDemo)
    return (await import("./frontend-demo")).localApi<T>(path, method, body);
  const session = await supabase?.auth.getSession();
  return requestJson<T>(`${apiBase}/api${path}`, {
    method,
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(session?.data.session
        ? { Authorization: `Bearer ${session.data.session.access_token}` }
        : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
