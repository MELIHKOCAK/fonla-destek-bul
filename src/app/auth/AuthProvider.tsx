import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  profileLoading: boolean;
  isAdmin: boolean;
  isCreator: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const mountedRef = useRef(true);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      const [{ data: profileRow }, { data: roleRows }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (!mountedRef.current) return;
      const roles = (roleRows ?? []).map((r) => r.role);
      setProfile(profileRow ?? null);
      setIsAdmin(roles.includes("admin"));
      setIsCreator(roles.includes("admin") || roles.includes("creator"));
    } catch (err) {
      console.error("[auth] loadProfile failed", err);
      if (mountedRef.current) {
        setProfile(null);
        setIsAdmin(false);
        setIsCreator(false);
      }
    } finally {
      if (mountedRef.current) setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Listener BEFORE getSession per Supabase recommendation.
    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event !== "INITIAL_SESSION" && event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED" && event !== "TOKEN_REFRESHED") {
        return;
      }
      setSession(nextSession);
      setStatus(nextSession?.user ? "authenticated" : "unauthenticated");

      if (event === "SIGNED_OUT") {
        setProfile(null);
        setIsAdmin(false);
        setIsCreator(false);
        return;
      }

      if (nextSession?.user && (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "INITIAL_SESSION")) {
        // Defer to avoid deadlocks in the auth callback.
        setTimeout(() => {
          if (!mountedRef.current) return;
          void loadProfile(nextSession.user.id);
        }, 0);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!mountedRef.current) return;
      setSession(data.session);
      setStatus(data.session?.user ? "authenticated" : "unauthenticated");
      if (data.session?.user) {
        void loadProfile(data.session.user.id);
      }
    });

    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    await loadProfile(session.user.id);
  }, [loadProfile, session?.user]);

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    // navigation handled by caller / route guards
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      profile,
      profileLoading,
      isAdmin,
      isCreator,
      refreshProfile,
      signOut,
    }),
    [status, session, profile, profileLoading, isAdmin, isCreator, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
