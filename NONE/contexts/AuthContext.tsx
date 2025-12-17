import createContextHook from '@nkzw/create-context-hook';
import { useMutation } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

const MAGIC_LINK_REDIRECT = Linking.createURL('/auth-callback');

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

const extractTokensFromUrl = (rawUrl: string): TokenPair | null => {
  if (!rawUrl || !rawUrl.includes('auth-callback')) {
    return null;
  }

  const hashIndex = rawUrl.indexOf('#');
  const queryIndex = rawUrl.indexOf('?');
  const paramsString = hashIndex >= 0
    ? rawUrl.slice(hashIndex + 1)
    : queryIndex >= 0
      ? rawUrl.slice(queryIndex + 1)
      : '';

  if (!paramsString) {
    return null;
  }

  const params = new URLSearchParams(paramsString);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
  };
};

const useAuthContextValue = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const hydrateSession = useCallback(async () => {
    try {
      console.log('[Auth] Loading existing session...');
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('[Auth] Failed to load session', error);
      }
      setSession(data?.session ?? null);
    } catch (error) {
      console.error('[Auth] Unexpected session error', error);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log('[Auth] Auth state changed', event);
      setSession(currentSession);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const completeSessionFromUrl = useCallback(async (url: string | null) => {
    if (!url) {
      return;
    }
    const tokens = extractTokensFromUrl(url);
    if (!tokens) {
      return;
    }
    try {
      console.log('[Auth] Completing session from magic link');
      await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
    } catch (error) {
      console.error('[Auth] Failed to set session from URL', error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (!isMounted) {
        return;
      }
      await completeSessionFromUrl(initialUrl);
    };

    init();

    const subscription = Linking.addEventListener('url', async event => {
      if (!isMounted) {
        return;
      }
      console.log('[Auth] Received deep link', event.url);
      await completeSessionFromUrl(event.url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [completeSessionFromUrl]);

  const {
    mutateAsync: triggerMagicLink,
    isPending: isSendingMagicLink,
    error: sendMagicLinkError,
  } = useMutation({
    mutationFn: async (email: string) => {
      console.log('[Auth] Sending magic link request', email);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: MAGIC_LINK_REDIRECT,
        },
      });
      if (error) {
        throw error;
      }
      return email;
    },
  });

  const {
    mutateAsync: triggerSignOut,
    isPending: isSigningOut,
  } = useMutation({
    mutationFn: async () => {
      console.log('[Auth] Signing out');
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    },
  });

  const {
    mutateAsync: triggerGoogleOAuth,
    isPending: isGoogleSigningIn,
  } = useMutation({
    mutationFn: async () => {
      console.log('[Auth] Starting Google OAuth');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: MAGIC_LINK_REDIRECT,
          skipBrowserRedirect: true,
        },
      });
      if (error) {
        throw error;
      }

      const authUrl = data?.url;
      if (!authUrl) {
        throw new Error('Unable to start Google sign in.');
      }

      if (Platform.OS === 'web') {
        globalThis?.window?.location.assign(authUrl);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(authUrl, MAGIC_LINK_REDIRECT);
      if (result.type === 'success' && result.url) {
        await completeSessionFromUrl(result.url);
        return;
      }

      if (result.type === 'cancel') {
        throw new Error('Google sign in was canceled.');
      }

      throw new Error('Unable to complete Google sign in.');
    },
  });

  const sendMagicLink = useCallback(
    (email: string) => triggerMagicLink(email),
    [triggerMagicLink],
  );

  const signInWithGoogle = useCallback(
    () => triggerGoogleOAuth(),
    [triggerGoogleOAuth],
  );

  const signOut = useCallback(
    () => triggerSignOut(),
    [triggerSignOut],
  );

  return useMemo(() => ({
    session,
    isAuthLoading,
    redirectUri: MAGIC_LINK_REDIRECT,
    sendMagicLink,
    isSendingMagicLink,
    sendMagicLinkError,
    signInWithGoogle,
    isGoogleSigningIn,
    signOut,
    isSigningOut,
  }), [
    session,
    isAuthLoading,
    sendMagicLink,
    isSendingMagicLink,
    sendMagicLinkError,
    signInWithGoogle,
    isGoogleSigningIn,
    signOut,
    isSigningOut,
  ]);
};

export const [AuthProvider, useAuth] = createContextHook(useAuthContextValue);
