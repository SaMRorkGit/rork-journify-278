import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../../contexts/AppStateContext';
import Colors from '../../constants/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, calculateXPForLevel } = useAppState();
  const profile = state.userProfile;

  const handleOnboarding = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/onboarding');
  };

  const handleProfileDetails = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/profile-details');
  };

  const handleVisionPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/vision-editor');
  };

  const handleAspirationsMenu = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/aspirations' as any);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person-outline" size={24} color={Colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{profile?.name || 'Guest User'}</Text>
          </View>
          <View style={styles.levelBadgeContainer}>
            <View style={styles.levelBadge}>
              <Ionicons name="medal-outline" size={16} color={Colors.primary} />
              <Text style={styles.levelText}>Lv {state.userProgress?.level ?? 1}</Text>
            </View>
            <View style={styles.levelProgressBar}>
              <View
                style={[
                  styles.levelProgressFill,
                  {
                    width: `${((state.userProgress?.xp ?? 0) /
                      calculateXPForLevel(state.userProgress?.level ?? 1)) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Vision Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="eye-outline" size={20} color={Colors.text} />
            <Text style={styles.sectionTitle}>Vision</Text>
          </View>

          {state.vision ? (
            <TouchableOpacity style={styles.visionCard} onPress={handleVisionPress}>
              <Text style={styles.visionText} numberOfLines={3}>
                {state.vision.text}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.emptyVisionCard} onPress={handleVisionPress}>
              <Ionicons name="eye-outline" size={32} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>Design your life vision</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.menuButton} onPress={handleAspirationsMenu} testID="profileAspirationsMenu">
            <View style={styles.menuButtonLeft}>
              <Ionicons name="flag-outline" size={20} color={Colors.text} />
              <View style={styles.menuButtonTextWrap}>
                <Text style={styles.menuButtonTitle}>Aspirations</Text>
                <Text style={styles.menuButtonSubtitle}>Explore your life areas</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={20} color={Colors.text} />
            <Text style={styles.sectionTitle}>Settings</Text>
          </View>

          <TouchableOpacity style={styles.settingsButton} onPress={handleProfileDetails}>
            <View style={styles.settingsButtonLeft}>
              <Ionicons name="person-outline" size={20} color={Colors.text} />
              <Text style={styles.settingsButtonText}>Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsButton} onPress={handleOnboarding}>
            <View style={styles.settingsButtonLeft}>
              <Ionicons name="settings-outline" size={20} color={Colors.text} />
              <Text style={styles.settingsButtonText}>Onboarding</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  levelBadgeContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  levelProgressBar: {
    width: 80,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  levelProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  visionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  visionText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  emptyVisionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 40,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
    fontWeight: '500',
  },
  menuButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuButtonTextWrap: {
    flex: 1,
    gap: 2,
  },
  menuButtonTitle: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  menuButtonSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  settingsButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  settingsButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsButtonText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
});
