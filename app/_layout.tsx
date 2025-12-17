import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient } from '@/lib/trpc';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import useSuppressLinkedInJobExtractorError from '@/hooks/useSuppressLinkedInJobExtractorError';
import ToastLayer from '@/components/ToastLayer';
import { AppStateProvider } from '@/contexts/AppStateContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider } from '@/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="reflection-results" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="habit-setup" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
      <Stack.Screen name="goal-setup" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="vision-guide" options={{ headerShown: false }} />
      <Stack.Screen name="goal-actions" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="habit-edit" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="weekly-planning" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="task-edit" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="profile-details" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="vision-editor" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="aspiration-editor" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="goal-details" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="journal-compose" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="journal-entry/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useSuppressLinkedInJobExtractorError();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <AppStateProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <RootLayoutNav />
                <ToastLayer />
              </GestureHandlerRootView>
            </AppStateProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
