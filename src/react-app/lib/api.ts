import { createClient } from "@supabase/supabase-js";
export const demoMode = import.meta.env.DEV && import.meta.env.MODE === "demo";
export const configured = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);
export const frontendDemo =
  !configured && !demoMode && import.meta.env.VITE_FRONTEND_DEMO !== "false";
export const supabase =
  configured && !demoMode
    ? createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      )
    : null;
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  if (frontendDemo)
    return (await import("./frontend-demo")).localApi<T>(path, method, body);
  const session = await supabase?.auth.getSession();
  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(session?.data.session
        ? { Authorization: `Bearer ${session.data.session.access_token}` }
        : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
