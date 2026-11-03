import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { HTTPException } from "hono/http-exception";
export type Env = {
  Bindings: {
    SUPABASE_URL: string;
    SUPABASE_PUBLISHABLE_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
  };
  Variables: { db: SupabaseClient; authId: string };
};
export function dbClient(url: string, key: string, token: string) {
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export function unwrap<T>({
  data,
  error,
}: {
  data: T;
  error: { code?: string; message: string } | null;
}): NonNullable<T> {
  if (error) {
    const status =
      error.code === "42501"
        ? 403
        : error.code === "28000"
          ? 401
          : error.code === "23505"
            ? 409
            : error.message.includes("limit") ||
                error.message.includes("Too many")
              ? 429
              : 400;
    throw new HTTPException(status, {
      message:
        error.code === "23505"
          ? "Already exists. Choose a different nickname or check your requests."
          : error.message,
    });
  }
  return data as NonNullable<T>;
}
export const messageSelect =
  "*,profiles!messages_sender_id_fkey(id,username,avatar_seed,allows_dm_requests),reactions(user_id,emoji)";
