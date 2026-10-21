import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { SessionUser } from "@shared/types";
import { api, setCsrf, setUnauthorizedHandler } from "./api";

type AuthState = {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signedIn: (u: SessionUser, csrf: string) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>(null as unknown as AuthState);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me", { credentials: "same-origin" });
      const data = (await r.json()) as { user: SessionUser | null; csrfToken?: string };
      if (data.user && data.csrfToken) {
        setCsrf(data.csrfToken);
        setUser(data.user);
      } else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    setUnauthorizedHandler(() => setUser(null));
  }, [refresh]);

  const signedIn = (u: SessionUser, csrf: string) => {
    setCsrf(csrf);
    setUser(u);
  };
  const signOut = async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      setCsrf("");
      setUser(null);
    }
  };

  return <AuthContext.Provider value={{ user, loading, refresh, signedIn, signOut }}>{children}</AuthContext.Provider>;
}
