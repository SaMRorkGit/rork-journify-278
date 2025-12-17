import { Redirect } from 'expo-router';
import { useURL } from 'expo-linking';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallbackScreen() {
  const { session, isAuthLoading } = useAuth();
  const url = useURL();

  useEffect(() => {
    if (url) {
      console.log('[AuthCallback] Received URL', url);
    }
  }, [url]);

  if (!isAuthLoading && session) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.container} testID="auth-callback-screen">
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.text}>Completing your secure sign in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  text: {
    color: Colors.text,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});
