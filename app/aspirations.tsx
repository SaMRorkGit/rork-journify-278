import React, { useMemo, useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useAppState } from '@/contexts/AppStateContext';
import type { LifeArea } from '@/types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const LIFE_AREA_CONFIG: Record<LifeArea, { label: string; icon: IoniconName; color: string }> = {
  relationship: { label: 'Relationship', icon: 'heart-outline', color: '#FF6B9D' },
  career: { label: 'Career', icon: 'briefcase-outline', color: '#4A90E2' },
  health: { label: 'Health', icon: 'fitness-outline', color: '#47c447' },
  finance: { label: 'Finance', icon: 'wallet-outline', color: '#F5A623' },
  growth: { label: 'Growth', icon: 'leaf-outline', color: '#9B59B6' },
};

export default function AspirationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useAppState();
  const profile = state.userProfile;

  const sortedLifeAreas = useMemo(() => {
    const lifeAreasArray: LifeArea[] = ['relationship', 'career', 'health', 'finance', 'growth'];
    if (profile?.lifeAreaRanking && profile.lifeAreaRanking.length > 0) {
      return profile.lifeAreaRanking;
    }
    return lifeAreasArray;
  }, [profile?.lifeAreaRanking]);

  const handleLifeAreaPress = useCallback(
    (lifeArea: LifeArea) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const aspiration = state.aspirations.find(a => a.lifeArea === lifeArea);
      router.push({
        pathname: '/aspiration-editor' as any,
        params: aspiration ? { lifeArea, aspirationId: aspiration.id } : { lifeArea },
      });
    },
    [router, state.aspirations],
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Aspirations', headerBackTitle: 'Back' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        showsVerticalScrollIndicator={false}
        testID="aspirationsScroll"
      >
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Life areas</Text>
        </View>

        <View style={styles.list}>
          {sortedLifeAreas.map(lifeArea => {
            const config = LIFE_AREA_CONFIG[lifeArea];
            const aspiration = state.aspirations.find(a => a.lifeArea === lifeArea);

            return (
              <TouchableOpacity
                key={lifeArea}
                style={styles.card}
                onPress={() => handleLifeAreaPress(lifeArea)}
                activeOpacity={0.75}
                testID={`aspirationsLifeArea_${lifeArea}`}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${config.color}1F` }]}
                  testID={`aspirationsLifeAreaIcon_${lifeArea}`}
                >
                  <Ionicons name={config.icon} size={22} color={config.color} />
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardTitle}>{config.label}</Text>
                    {aspiration ? (
                      <View style={styles.savedPill}>
                        <Text style={styles.savedPillText}>Saved</Text>
                      </View>
                    ) : null}
                  </View>

                  {aspiration ? (
                    <Text style={styles.cardText} numberOfLines={2}>
                      {aspiration.description}
                    </Text>
                  ) : null}
                </View>

                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            );
          })}
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  headerBlock: {
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  savedPill: {
    backgroundColor: Colors.primary + '1A',
    borderWidth: 1,
    borderColor: Colors.primary + '2A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  savedPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  newPill: {
    backgroundColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  newPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  cardText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  cardEmptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});
