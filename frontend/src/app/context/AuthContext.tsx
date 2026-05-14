import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  type AuthUser,
  getMyInfo,
  getStoredToken,
  loginRequest,
  logoutRequest,
  refreshTokenRequest,
  registerRequest,
  setStoredToken,
} from '../lib/authApi';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  signInWithPassword: (username: string, password: string) => Promise<void>;
  signUp: (args: { username: string; password: string; displayName: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      setUser(await getMyInfo(token));
      return;
    } catch {
      try {
        const { token: newToken } = await refreshTokenRequest(token);
        setStoredToken(newToken);
        setUser(await getMyInfo(newToken));
      } catch {
        setStoredToken(null);
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('[AuthContext] Bootstrap timed out, setting loading to false');
        setLoading(false);
      }
    }, 5000);

    (async () => {
      setLoading(true);
      await bootstrap();
      clearTimeout(timeout);
      if (mounted) {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [bootstrap]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user,
      loading,
      signInWithPassword: async (username, password) => {
        const { token } = await loginRequest(username, password);
        setStoredToken(token);
        setUser(await getMyInfo(token));
      },
      signUp: async (args) => {
        await registerRequest(args);
        const { token } = await loginRequest(args.username, args.password);
        setStoredToken(token);
        setUser(await getMyInfo(token));
      },
      signOut: async () => {
        const t = getStoredToken();
        if (t) {
          try {
            await logoutRequest(t);
          } catch {
            /* still clear local session */
          }
        }
        setStoredToken(null);
        setUser(null);
      },
    }),
    [user, loading, bootstrap]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
