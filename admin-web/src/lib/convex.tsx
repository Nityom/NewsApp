import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react';
import { onAuthStateChanged } from 'firebase/auth';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { auth } from './firebase';

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL ?? 'https://quirky-rooster-395.convex.cloud',
  { unsavedChangesWarning: false },
);

function useFirebaseAuthForConvex() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth.currentUser));

  useEffect(() => onAuthStateChanged(auth, (user) => {
    setIsAuthenticated(Boolean(user));
    setIsLoading(false);
  }), []);

  const fetchAccessToken = useCallback(async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
    return auth.currentUser?.getIdToken(forceRefreshToken) ?? null;
  }, []);

  return useMemo(
    () => ({ isLoading, isAuthenticated, fetchAccessToken }),
    [fetchAccessToken, isAuthenticated, isLoading],
  );
}

export function AppConvexProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useFirebaseAuthForConvex}>
      {children}
    </ConvexProviderWithAuth>
  );
}
