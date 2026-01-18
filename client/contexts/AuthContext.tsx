import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';

const USER_STORAGE_KEY = '@snoozer/user';

// Local user type (no Firebase dependency)
interface LocalUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: LocalUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from storage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch (error) {
        if (__DEV__) console.error('[Auth] Error loading user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  // Apple Sign-In - store locally
  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }

    try {
      // Request Apple credentials
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Build display name from full name if available
      let displayName: string | null = null;
      if (credential.fullName) {
        const { givenName, familyName } = credential.fullName;
        displayName = [givenName, familyName].filter(Boolean).join(' ') || null;
      }

      // Create local user
      const localUser: LocalUser = {
        uid: credential.user,
        email: credential.email,
        displayName,
      };

      // Store in AsyncStorage
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(localUser));
      setUser(localUser);

      if (__DEV__) console.log('[Auth] Apple Sign-In successful:', localUser.uid);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ERR_REQUEST_CANCELED'
      ) {
        // User canceled the sign-in
        if (__DEV__) console.log('[Auth] Apple Sign-In canceled by user');
        return;
      }
      if (__DEV__) console.error('[Auth] Apple Sign-In error:', error);
      throw error;
    }
  }, []);

  // Google Sign-In - not implemented for local auth
  const signInWithGoogle = useCallback(async () => {
    // For local auth, Google Sign-In would need expo-auth-session
    // For now, just show an alert that it's not available
    throw new Error('Google Sign-In is not available in local auth mode');
  }, []);

  // Sign out - clear local storage
  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      if (__DEV__) console.log('[Auth] Signed out');
    } catch (error) {
      if (__DEV__) console.error('[Auth] Sign out error:', error);
      // Still clear user state even if storage fails
      setUser(null);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signInWithApple,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
