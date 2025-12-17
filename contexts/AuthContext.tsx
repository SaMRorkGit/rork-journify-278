import createContextHook from '@nkzw/create-context-hook';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

export const [AuthProvider, useAuth] = createContextHook(() => {
  // All state hooks must be declared unconditionally at the top level
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState<boolean>(false);
  const [sendMagicLinkError, setSendMagicLinkError] = useState<Error | null>(null);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  
  // All ref hooks must be declared unconditionally at the top level
  const isMountedRef = useRef<boolean>(true);

  // All effect hooks must be declared unconditionally at the top level
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const hydrateSession = async () => {
      try {
        console.log('[Auth] Loading existing session...');
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[Auth] Failed to load session', error);
        }
        if (isMountedRef.current) {
          setSession(data?.session ?? null);
        }
      } catch (error) {
        console.error('[Auth] Unexpected session error', error);
      } finally {
        if (isMountedRef.current) {
          setIsAuthLoading(false);
        }
      }
    };

    hydrateSession();
  }, []);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log('[Auth] Auth state changed', event);
      if (isMountedRef.current) {
        setSession(currentSession);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const completeSessionFromUrl = async (url: string | null) => {
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
    };

    const init = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (isMountedRef.current) {
        await completeSessionFromUrl(initialUrl);
      }
    };

    init();

    const subscription = Linking.addEventListener('url', async event => {
      if (isMountedRef.current) {
        console.log('[Auth] Received deep link', event.url);
        await completeSessionFromUrl(event.url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // All callback hooks must be declared unconditionally at the top level
  const sendMagicLink = useCallback(async (email: string) => {
    setIsSendingMagicLink(true);
    setSendMagicLinkError(null);
    try {
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
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to send magic link');
      if (isMountedRef.current) {
        setSendMagicLinkError(err);
      }
      throw err;
    } finally {
      if (isMountedRef.current) {
        setIsSendingMagicLink(false);
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      console.log('[Auth] Signing out');
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } finally {
      if (isMountedRef.current) {
        setIsSigningOut(false);
      }
    }
  }, []);

  // useMemo hook must be declared unconditionally at the top level (in return statement is acceptable)
  return useMemo(() => ({
    session,
    isAuthLoading,
    redirectUri: MAGIC_LINK_REDIRECT,
    sendMagicLink,
    isSendingMagicLink,
    sendMagicLinkError,
    signOut,
    isSigningOut,
  }), [
    session,
    isAuthLoading,
    sendMagicLink,
    isSendingMagicLink,
    sendMagicLinkError,
    signOut,
    isSigningOut,
  ]);
});
