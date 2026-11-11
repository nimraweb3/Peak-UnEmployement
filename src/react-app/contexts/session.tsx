import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, supabase, demoMode, frontendDemo } from "../lib/api";
import type { Profile } from "../../shared/types";
const Context = createContext<{
  session: Session | null;
  ready: boolean;
  recovery: boolean;
  profile: Profile | undefined;
  loading: boolean;
  error: Error | null;
}>({
  session: null,
  ready: false,
  recovery: false,
  profile: undefined,
  loading: false,
  error: null,
});
export function SessionProvider({ children }: { children: ReactNode }) {
  const [recovery, setRecovery] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase && !demoMode);
  const qc = useQueryClient();
  useEffect(() => {
    if (frontendDemo) {
      let active = true;
      const refresh = () => {
        void import("../lib/frontend-demo").then(({ localIdentity }) => {
          if (!active) return;
          const user = localIdentity();
          qc.clear();
          setSession(
            user
              ? {
                  user: {
                    id: user.id,
                    is_anonymous: true,
                    app_metadata: {},
                    user_metadata: {},
                    aud: "authenticated",
                    created_at: user.created_at,
                  },
                  access_token: "",
                  refresh_token: "",
                  expires_in: 0,
                  token_type: "bearer",
                }
              : null,
          );
          setReady(true);
        });
      };
      refresh();
      window.addEventListener("frontend-session", refresh);
      return () => {
        active = false;
        window.removeEventListener("frontend-session", refresh);
      };
    }
    if (demoMode) {
      let active = true;
      void api<{ id: string | null }>("/demo/session")
        .then((data) => {
          if (!active) return;
          setSession(
            data.id
              ? {
                  user: {
                    id: data.id,
                    is_anonymous: true,
                    app_metadata: {},
                    user_metadata: {},
                    aud: "authenticated",
                    created_at: "",
                  },
                  access_token: "",
                  refresh_token: "",
                  expires_in: 0,
                  token_type: "bearer",
                }
              : null,
          );
          setReady(true);
        })
        .catch(() => {
          if (active) setReady(true);
        });
      return () => {
        active = false;
      };
    }
    if (!supabase) return;
    let previousUser: string | undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (_event === "PASSWORD_RECOVERY") setRecovery(true);
      if (!next) setRecovery(false);
      if (previousUser !== next?.user.id) {
        qc.clear();
        void supabase?.removeAllChannels();
      }
      previousUser = next?.user.id;
      setSession(next);
      setReady(true);
      if (!next) qc.clear();
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);
  const profile = useQuery({
    queryKey: ["me", session?.user.id],
    queryFn: () => api<Profile>("/me"),
    enabled: !!session,
    retry: 1,
    staleTime: 60000,
  });
  return (
    <Context.Provider
      value={{
        session,
        recovery,
        ready,
        profile: profile.data,
        loading: profile.isLoading,
        error: profile.error,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useSession = () => useContext(Context);
