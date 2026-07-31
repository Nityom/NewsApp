import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { currentAdmin, currentReporter } from '@/mocks/data';
import type { CurrentUser } from '@/types/models';

type Role = 'reporter' | 'admin';

interface AuthContextValue {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginAsReporter: () => Promise<void>;
  loginAsAdmin: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loginAsReporter = async () => {
    setIsLoading(true);
    await delay(900);
    setUser(currentReporter);
    setIsLoading(false);
  };

  const loginAsAdmin = async () => {
    setIsLoading(true);
    await delay(900);
    setUser(currentAdmin);
    setIsLoading(false);
  };

  const logout = () => setUser(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      loginAsReporter,
      loginAsAdmin,
      logout,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export type { Role };
