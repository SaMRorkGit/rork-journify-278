import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Alert } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAppState } from '../contexts/AppStateContext';
import Colors from '../constants/colors';
import type { Vision } from '../types';

export default function VisionEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { state, updateVision } = useAppState();
  const [visionText, setVisionText] = useState<string>(state.vision?.text || '');

  const handleSave = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (!visionText.trim()) {
      Alert.alert('Required', 'Please enter your vision.');
      return;
    }

    const vision: Vision = {
      text: visionText.trim(),
      imageUrls: state.vision?.imageUrls || [],
      createdAt: state.vision?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    updateVision(vision);

    const returnTo = typeof params?.returnTo === 'string' && params.returnTo.length > 0 ? params.returnTo : undefined;
    console.log('[VisionEditor] Save complete, navigating', { canGoBack: router.canGoBack(), returnTo });

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  }, [params?.returnTo, router, state.vision, updateVision, visionText]);

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: state.vision ? 'Edit Vision' : 'Create Vision',
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.text,
          headerLeft: () => (
            <TouchableOpacity
              testID="visionEditorBack"
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)/profile');
                }
              }}
              activeOpacity={0.7}
              style={styles.headerBack}
            >
              <ArrowLeft size={20} color={Colors.text} />
              <Text style={styles.headerBackText}>Back</Text>
            </TouchableOpacity>
          ),
        }} 
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Design Your Life Vision</Text>
          <Text style={styles.subtitle}>Imagine your perfect life...</Text>
          <View style={styles.bulletContainer}>
            <Text style={styles.bulletPoint}>• What does success look like to you?</Text>
            <Text style={styles.bulletPoint}>• What legacy do you want to leave behind?</Text>
            <Text style={styles.bulletPoint}>• What impact do you want to create?</Text>
            <Text style={styles.bulletPoint}>• Who do you want to become?</Text>
            <Text style={styles.bulletPoint}>• How do you feel?</Text>
            <Text style={styles.bulletPoint}>• What core values do you want to live by?</Text>
          </View>

          <TextInput
            style={styles.textArea}
            placeholder="Write your vision here..."
            placeholderTextColor={Colors.textSecondary}
            value={visionText}
            onChangeText={setVisionText}
            multiline
            numberOfLines={12}
            textAlignVertical="top"
          />

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSave}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>Save Vision</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletContainer: {
    marginBottom: 24,
    paddingLeft: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 4,
  },
  textArea: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    minHeight: 200,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.surface,
  },
  headerBack: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  headerBackText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
});
