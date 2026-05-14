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
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  signInWithPassword: (username: string, password: string) => Promise<void>;
  signUp: (args: { username: string; password: string; displayName: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] Token state changed:', token);
  }, [token]);

  useEffect(() => {
    console.log('[AuthContext] User state changed:', user?.username);
  }, [user]);

  const bootstrap = useCallback(async () => {
    const storedToken = getStoredToken();
    if (!storedToken) {
      setUser(null);
      setToken(null);
      return;
    }
    try {
      const info = await getMyInfo(storedToken);
      setUser(info);
      setToken(storedToken);
      return;
    } catch {
      try {
        const { token: newToken } = await refreshTokenRequest(storedToken);
        setStoredToken(newToken);
        setToken(newToken);
        setUser(await getMyInfo(newToken));
      } catch {
        setStoredToken(null);
        setToken(null);
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
      token,
      isAuthenticated: !!user,
      loading,
      signInWithPassword: async (username, password) => {
        console.log('[AuthContext] signInWithPassword called for:', username);
        const { token: newToken } = await loginRequest(username, password);
        console.log('[AuthContext] Login success, received token:', newToken ? 'YES' : 'NO');
        setStoredToken(newToken);
        setToken(newToken);
        const info = await getMyInfo(newToken);
        setUser(info);
      },
      signUp: async (args) => {
        await registerRequest(args);
        const { token: newToken } = await loginRequest(args.username, args.password);
        setStoredToken(newToken);
        setToken(newToken);
        setUser(await getMyInfo(newToken));
      },
      signOut: async () => {
        if (token) {
          try {
            await logoutRequest(token);
          } catch {
            /* still clear local session */
          }
        }
        setStoredToken(null);
        setToken(null);
        setUser(null);
      },
    }),
    [user, token, loading, bootstrap]
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
