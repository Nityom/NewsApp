import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

const convex = new ConvexReactClient('https://quirky-rooster-395.convex.cloud', {
  unsavedChangesWarning: false,
});

function useFirebaseAuthForConvex() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuth().currentUser);

  useEffect(() => onAuthStateChanged(getAuth(), (user) => {
    setIsAuthenticated(!!user);
    setIsLoading(false);
  }), []);

  const fetchAccessToken = useCallback(async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
    return getAuth().currentUser?.getIdToken(forceRefreshToken) ?? null;
  }, []);

  return useMemo(() => ({ isLoading, isAuthenticated, fetchAccessToken }), [fetchAccessToken, isAuthenticated, isLoading]);
}

export function ConvexFirebaseProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useFirebaseAuthForConvex}>
      {children}
    </ConvexProviderWithAuth>
  );
}