import { Redirect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Sparkles } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const router = useRouter();
  const { session, isAuthLoading, sendMagicLink, isSendingMagicLink, redirectUri } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const isEmailValid = useMemo(() => emailRegex.test(normalizedEmail), [normalizedEmail]);

  const handleSendLink = useCallback(async () => {
    if (!normalizedEmail || !isEmailValid) {
      setErrorMessage('Enter a valid email to receive your secure link.');
      return;
    }

    try {
      console.log('[Auth] Triggering magic link from login screen');
      setStatusMessage(null);
      setErrorMessage(null);
      await sendMagicLink(normalizedEmail);
      setStatusMessage('Magic link sent. Check your inbox to continue.');
    } catch (error) {
      console.error('[Auth] Magic link error', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send magic link right now.');
    }
  }, [isEmailValid, normalizedEmail, sendMagicLink]);

  if (isAuthLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/" />;
  }

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <View style={styles.container} testID="login-screen">
            <Text style={styles.appTitle}>Journify</Text>
            <View style={styles.heroCard}>
              <View style={styles.heroIconWrapper}>
                <Sparkles color={Colors.mint} size={24} />
              </View>
              <Text style={styles.title}>Sign in with a magic link</Text>
              <Text style={styles.subtitle}>
                No passwords, just a secure link emailed straight to you.
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Mail color={Colors.textSoft} size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.textSoft}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  returnKeyType="send"
                  onSubmitEditing={handleSendLink}
                  testID="login-email-input"
                />
              </View>

              {errorMessage ? (
                <Text style={styles.errorText} testID="login-error">
                  {errorMessage}
                </Text>
              ) : null}

              {statusMessage ? (
                <Text style={styles.statusText} testID="login-status">
                  {statusMessage}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[styles.button, (!isEmailValid || isSendingMagicLink) && styles.buttonDisabled]}
                onPress={handleSendLink}
                disabled={!isEmailValid || isSendingMagicLink}
                testID="send-magic-link-button"
              >
                {isSendingMagicLink ? (
                  <ActivityIndicator color={Colors.bgDeep} />
                ) : (
                  <Text style={styles.buttonText}>Send magic link</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.helperText}>
                We will redirect you to {redirectUri} when you tap the link.
              </Text>

              <TouchableOpacity
                style={styles.tempNavButton}
                onPress={() => {
                  console.log('[Login] Temporary navigation to Today');
                  router.replace('/today');
                }}
                testID="temp-nav-today-button"
              >
                <Text style={styles.tempNavButtonText}>Temporary: Go to Today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    justifyContent: 'center',
    gap: 24,
  },
  appTitle: {
    fontSize: 42,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroCard: {
    backgroundColor: Colors.glassBg,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
  },
  heroIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  form: {
    backgroundColor: Colors.glassBg,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 16,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSoft,
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 14,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
  },
  statusText: {
    color: Colors.mint,
    fontSize: 14,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.bgDeep,
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    color: Colors.textSoft,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  tempNavButton: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  tempNavButtonText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
