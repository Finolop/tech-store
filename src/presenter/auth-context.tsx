import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as api from '../model/auth';
import type { RegisterData, Result, User } from '../model/auth';

interface AuthValue {
  user: User | null;
  ready: boolean;
  signedOut: boolean;
  register: (data: RegisterData) => Promise<Result>;
  login: (identifier: string, password: string, remember: boolean) => Promise<Result>;
  logout: () => void;
  updateProfile: (updates: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    login?: string;
  }) => Promise<Result>;
  changePassword: (current: string, next: string, next2: string) => Promise<Result>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api.fetchCurrentUser().then((current) => {
      if (cancelled) return;
      setUser(current);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthValue>(() => {
    const accept = (result: Result): Result => {
      if (result.ok && result.user) {
        setUser(result.user);
        setSignedOut(false);
      }
      return result;
    };
    return {
      user,
      ready,
      signedOut,
      register: async (data) => accept(await api.register(data)),
      login: async (id, pw, remember) => accept(await api.login(id, pw, remember)),
      logout: () => {
        setUser(null);
        setSignedOut(true);
        void api.logout();
      },
      updateProfile: async (updates) => accept(await api.updateProfile(updates)),
      changePassword: api.changePassword,
    };
  }, [user, ready, signedOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
