import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    createUserWithEmailAndPassword,
    EmailAuthProvider,
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    reauthenticateWithCredential,
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithCredential,
    signInWithEmailAndPassword,
    signOut,
    updatePassword,
    updateProfile,
} from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { clearJustSubmittedReporterId } from '@/lib/joinRequestFlag';
import {
    GOOGLE_PLAY_REVIEW_PASSWORD,
    isGooglePlayReviewEmail,
} from '@/lib/reviewAccount';
import type { CurrentUser } from '@/types/models';

type Role = 'reporter' | 'admin';

const ROLE_STORAGE_KEY = 'enr:auth:roleByEmail';
const PROFILE_STORAGE_KEY = 'enr:auth:profileByEmail';
const SESSION_STORAGE_KEY = 'enr:auth:sessionExpiryByEmail';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // keep users signed in for one month

// Temporary hardcoded admin login until a real admin account exists in Firebase.
const HARDCODED_ADMIN_EMAIL = 'admin@educationnews.com';
const HARDCODED_ADMIN_PASSWORD = 'Admin@1234';

// Web client ID from google-services.json (client_type: 3) - required by GoogleSignin.configure().
GoogleSignin.configure({
  webClientId: '522828191876-mg6jcrm23hda7tvbsesa14cjm11sco3e.apps.googleusercontent.com',
});

type ProfileOverrides = Partial<Pick<CurrentUser, 'name' | 'phone' | 'bio' | 'city' | 'avatar'>>;

interface AuthContextValue {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: Role) => Promise<void>;
  loginWithGoogle: (role: Role) => Promise<CurrentUser>;
  register: (email: string, password: string) => Promise<CurrentUser>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: ProfileOverrides) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function profileForRole(role: Role, email: string, overrides?: Partial<CurrentUser>): CurrentUser {
  const defaultName = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const profile: CurrentUser = {
    id: role === 'admin' ? 'admin' : `reporter-${email.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: defaultName,
    email,
    phone: '',
    avatar: '',
    bio: '',
    city: '',
    role,
    isVerified: role === 'admin',
    isSubscribed: false,
    joinedAt: '',
    ...overrides,
  };
  return role === 'admin'
    ? { ...profile, name: overrides?.name?.trim() || 'Admin', avatar: '' }
    : profile;
}

async function getStoredRole(email: string): Promise<Role | null> {
  try {
    const raw = await AsyncStorage.getItem(ROLE_STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, Role>) : {};
    return map[email.toLowerCase()] ?? null;
  } catch {
    return null;
  }
}

async function storeRole(email: string, role: Role) {
  try {
    const raw = await AsyncStorage.getItem(ROLE_STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, Role>) : {};
    map[email.toLowerCase()] = role;
    await AsyncStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore persistence failures, session will just require re-login
  }
}

async function getStoredProfile(email: string): Promise<ProfileOverrides | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, ProfileOverrides>) : {};
    return map[email.toLowerCase()] ?? null;
  } catch {
    return null;
  }
}

async function storeProfile(email: string, updates: ProfileOverrides) {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, ProfileOverrides>) : {};
    map[email.toLowerCase()] = { ...map[email.toLowerCase()], ...updates };
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore persistence failures, edits will not survive a fresh login
  }
}

async function getSessionExpiry(email: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    return map[email.toLowerCase()] ?? null;
  } catch {
    return null;
  }
}

async function refreshSessionExpiry(email: string) {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    map[email.toLowerCase()] = Date.now() + SESSION_DURATION_MS;
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore persistence failures, session will just expire sooner than expected
  }
}

function loginError(error: unknown): Error {
  const authError = error as { code?: string; message?: string };
  const invalidCredentials = new Set([
    'auth/invalid-credential',
    'auth/user-not-found',
    'auth/wrong-password',
    'auth/invalid-email',
  ]);
  if (
    (authError.code && invalidCredentials.has(authError.code))
    || authError.message?.toLowerCase().includes('auth credential is incorrect, malformed')
  ) {
    return new Error('Account not found or email/password is incorrect.');
  }
  return error instanceof Error ? error : new Error('Could not sign in. Please try again.');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Prevents onAuthStateChanged from force-signing-out a brand new session while
  // login()/register() are still in the middle of storing its role.
  const authActionInProgressRef = useRef(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (authActionInProgressRef.current) return;
      if (firebaseUser?.email) {
        const role = await getStoredRole(firebaseUser.email);
        if (role) {
          const expiresAt = await getSessionExpiry(firebaseUser.email);
          if (expiresAt && Date.now() > expiresAt) {
            // Session older than one month - require the user to sign in again.
            await signOut(auth);
            setUser(null);
            setIsLoading(false);
            return;
          }
          if (!expiresAt) await refreshSessionExpiry(firebaseUser.email);
          const storedProfile = await getStoredProfile(firebaseUser.email);
          setUser(
            profileForRole(role, firebaseUser.email, {
              name: firebaseUser.displayName || undefined,
              ...storedProfile,
            }),
          );
        } else {
          // No known role for this session (e.g. cleared app data) - require explicit re-login.
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string, role: Role) => {
    const trimmedEmail = email.trim();
    if (role === 'reporter' && isGooglePlayReviewEmail(trimmedEmail)) {
      if (password !== GOOGLE_PLAY_REVIEW_PASSWORD) {
        throw new Error('Incorrect password. Please use the Google Play review password.');
      }
      authActionInProgressRef.current = true;
      try {
        const auth = getAuth();
        try {
          await signInWithEmailAndPassword(auth, trimmedEmail, password);
        } catch (signInError) {
          try {
            await createUserWithEmailAndPassword(auth, trimmedEmail, password);
          } catch (createError: any) {
            if (createError?.code === 'auth/email-already-in-use') {
              throw new Error(
                'The Google Play review account already exists with a different password. Reset it to the configured review password.',
              );
            }
            throw signInError;
          }
        }
        await storeRole(trimmedEmail, 'reporter');
        await storeProfile(trimmedEmail, { name: 'Google Play Reviewer', phone: '0000000000' });
        await refreshSessionExpiry(trimmedEmail);
        setUser(
          profileForRole('reporter', trimmedEmail, {
            name: 'Google Play Reviewer',
            phone: '0000000000',
            isVerified: true,
            isSubscribed: true,
          }),
        );
      } finally {
        authActionInProgressRef.current = false;
      }
      return;
    }

    if (role === 'admin' && trimmedEmail.toLowerCase() === HARDCODED_ADMIN_EMAIL) {
      if (password !== HARDCODED_ADMIN_PASSWORD) {
        throw new Error('Incorrect admin password. Use the configured admin password.');
      }
      // Back the hardcoded admin shortcut with a real Firebase account so Convex's
      // `request.auth != null` rules actually pass for admin sessions too.
      authActionInProgressRef.current = true;
      try {
        const auth = getAuth();
        try {
          await signInWithEmailAndPassword(auth, trimmedEmail, password);
        } catch (signInError) {
          // First time the hardcoded admin logs in - there's no Firebase account for it yet.
          try {
            await createUserWithEmailAndPassword(auth, trimmedEmail, password);
          } catch (createError: any) {
            if (createError?.code === 'auth/email-already-in-use') {
              throw new Error(
                'The Firebase admin account already exists with a different password. Reset its password to the configured admin password, then sign in again.',
              );
            }
            throw signInError;
          }
        }
        await storeRole(trimmedEmail, 'admin');
        await refreshSessionExpiry(trimmedEmail);
        const storedProfile = await getStoredProfile(trimmedEmail);
        setUser(profileForRole('admin', trimmedEmail, {
          name: auth.currentUser?.displayName || undefined,
          ...storedProfile,
        }));
      } finally {
        authActionInProgressRef.current = false;
      }
      return;
    }

    authActionInProgressRef.current = true;
    try {
      const auth = getAuth();
      let credential;
      try {
        credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      } catch (error) {
        throw loginError(error);
      }
      const resolvedEmail = credential.user.email ?? email.trim();
      const storedRole = await getStoredRole(resolvedEmail);
      if (storedRole && storedRole !== role) {
        await signOut(auth);
        throw new Error(`This account is registered as ${storedRole}, not ${role}.`);
      }
      await storeRole(resolvedEmail, role);
      await refreshSessionExpiry(resolvedEmail);
      const storedProfile = await getStoredProfile(resolvedEmail);
      setUser(
        profileForRole(role, resolvedEmail, {
          name: credential.user.displayName || undefined,
          ...storedProfile,
        }),
      );
    } finally {
      authActionInProgressRef.current = false;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    authActionInProgressRef.current = true;
    try {
      const auth = getAuth();
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await storeRole(email.trim(), 'reporter');
      await refreshSessionExpiry(email.trim());
      try {
        await sendEmailVerification(credential.user);
      } catch (verificationError) {
        // Account creation itself succeeded - don't block the user over a flaky verification email send.
        console.warn('sendEmailVerification failed:', verificationError);
      }
      const registeredUser = profileForRole('reporter', email.trim());
      setUser(registeredUser);
      return registeredUser;
    } finally {
      authActionInProgressRef.current = false;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(getAuth(), email.trim());
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const firebaseUser = getAuth().currentUser;
    if (!firebaseUser?.email) throw new Error('No signed-in email account found.');
    const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
    await reauthenticateWithCredential(firebaseUser, credential);
    await updatePassword(firebaseUser, newPassword);
  }, []);

  const loginWithGoogle = useCallback(async (role: Role) => {
    authActionInProgressRef.current = true;
    try {
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;
      if (!idToken) throw new Error('Google sign-in did not return an ID token.');

      const auth = getAuth();
      const googleCredential = GoogleAuthProvider.credential(idToken);
      const credential = await signInWithCredential(auth, googleCredential);
      const resolvedEmail = credential.user.email;
      if (!resolvedEmail) throw new Error('Your Google account has no email address.');

      const storedRole = await getStoredRole(resolvedEmail);
      if (storedRole && storedRole !== role) {
        await signOut(auth);
        throw new Error(`This account is registered as ${storedRole}, not ${role}.`);
      }
      await storeRole(resolvedEmail, role);
      await refreshSessionExpiry(resolvedEmail);
      const storedProfile = await getStoredProfile(resolvedEmail);
      const googleUser = profileForRole(role, resolvedEmail, {
        name: credential.user.displayName || undefined,
        avatar: credential.user.photoURL || undefined,
        ...storedProfile,
      });
      setUser(googleUser);
      return googleUser;
    } finally {
      authActionInProgressRef.current = false;
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    const firebaseUser = getAuth().currentUser;
    if (!firebaseUser) throw new Error('No user currently signed in.');
    await sendEmailVerification(firebaseUser);
  }, []);

  const logout = useCallback(async () => {
    const auth = getAuth();
    try {
      if (auth.currentUser) {
        // Ignore "no current user" - can happen with a stale local session from before a Firebase
        // account existed for it (e.g. the old hardcoded-admin session). The end state is the same.
        await signOut(auth).catch((error: { code?: string }) => {
          if (error?.code !== 'auth/no-current-user') throw error;
        });
      }
    } finally {
      clearJustSubmittedReporterId();
      setUser(null);
    }
  }, []);

  const updateUserProfile = useCallback(async (updates: ProfileOverrides) => {
    const auth = getAuth();
    const firebaseUser = auth.currentUser;
    if (!firebaseUser?.email) throw new Error('No user currently signed in.');

    if (updates.name !== undefined || updates.avatar !== undefined) {
      await updateProfile(firebaseUser, {
        ...(updates.name !== undefined ? { displayName: updates.name } : {}),
        ...(updates.avatar !== undefined ? { photoURL: updates.avatar } : {}),
      });
    }
    await storeProfile(firebaseUser.email, updates);
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      loginWithGoogle,
      register,
      resetPassword,
      changePassword,
      resendVerificationEmail,
      logout,
      updateUserProfile,
    }),
    [
      user,
      isLoading,
      login,
      loginWithGoogle,
      register,
      resetPassword,
      changePassword,
      resendVerificationEmail,
      logout,
      updateUserProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export type { Role };

