import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, supabase } from "../lib/api";
import type { Profile } from "../../shared/types";
const Context = createContext<{
  session: Session | null;
  ready: boolean;
  profile: Profile | undefined;
  loading: boolean;
  error: Error | null;
}>({
  session: null,
  ready: false,
  profile: undefined,
  loading: false,
  error: null,
});
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  const qc = useQueryClient();
  useEffect(() => {
    if (!supabase) return;
    let previousUser: string | undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
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
