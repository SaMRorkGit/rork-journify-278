import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useMemo, type ComponentType } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, Briefcase, Activity, Wallet, Sprout, ArrowLeft, ChevronRight } from 'lucide-react-native';
import { useAppState } from '../contexts/AppStateContext';
import Colors from '../constants/colors';
import { getLifeAreaLabel, resolveGoalLifeArea, resolveHabitLifeArea } from '../constants/life-area-helpers';
import type { LifeArea } from '../types';
import React from "react";

const LIFE_AREA_CONFIG: Record<LifeArea, { label: string; icon: ComponentType<any>; accent: string }> = {
  relationship: { label: 'Relationship', icon: Heart, accent: '#FF7FA5' },
  career: { label: 'Career', icon: Briefcase, accent: '#4A9DFF' },
  health: { label: 'Health', icon: Activity, accent: '#47c447' },
  finance: { label: 'Finance', icon: Wallet, accent: '#FFC857' },
  growth: { label: 'Growth', icon: Sprout, accent: '#AF9BFF' },
};

export default function AspirationEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lifeArea?: LifeArea }>();
  const { state } = useAppState();

  const lifeArea = (params.lifeArea as LifeArea | undefined) ?? 'growth';
  const config = LIFE_AREA_CONFIG[lifeArea];
  const IconComponent = config?.icon;

  const goalsForLifeArea = useMemo(() => {
    const list = state.goals
      .map(goal => ({ goal, area: resolveGoalLifeArea(goal, state.aspirations) }))
      .filter(item => item.area === lifeArea)
      .map(item => item.goal)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log('[AspirationEditor] goalsForLifeArea', { lifeArea, count: list.length });
    return list;
  }, [lifeArea, state.goals, state.aspirations]);

  const habitsForLifeArea = useMemo(() => {
    const list = state.habits
      .map(habit => ({ habit, area: resolveHabitLifeArea(habit, { aspirations: state.aspirations, goals: state.goals }) }))
      .filter(item => item.area === lifeArea)
      .map(item => item.habit)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log('[AspirationEditor] habitsForLifeArea', { lifeArea, count: list.length });
    return list;
  }, [lifeArea, state.habits, state.aspirations, state.goals]);

  const screenTitle = '';
  const lifeAreaLabel = getLifeAreaLabel(lifeArea) ?? config.label;
  const accent = config.accent;

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: screenTitle,
          headerStyle: {
            backgroundColor: Colors.background,
          },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              testID="aspirationEditorBack"
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)/profile' as any);
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
            paddingTop: 12,
            paddingBottom: insets.bottom + 28,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={[styles.heroCard, { borderColor: accent + '2A' }]}
          >
            <View style={[styles.heroIconWrap, { backgroundColor: accent + '1F' }]}
            >
              {IconComponent ? <IconComponent size={22} color={accent} /> : null}
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>{lifeAreaLabel}</Text>
              <Text style={styles.heroSubtitle}>Your goals & habits in this area</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Goals</Text>
            {goalsForLifeArea.length === 0 ? (
              <Text style={styles.emptyText}>No goals created for {lifeAreaLabel} yet.</Text>
            ) : (
              <View style={styles.list}>
                {goalsForLifeArea.map(goal => (
                  <TouchableOpacity
                    key={goal.id}
                    style={styles.rowCard}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/goal-details?id=${goal.id}` as any)}
                    testID={`aspiration-lifearea-goal-${goal.id}`}
                  >
                    <View style={styles.rowCardText}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {goal.title}
                      </Text>
                      {goal.targetDate ? (
                        <Text style={styles.rowMeta}>
                          Target {new Date(goal.targetDate).toLocaleDateString()}
                        </Text>
                      ) : null}
                    </View>
                    <ChevronRight size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Habits</Text>
            {habitsForLifeArea.length === 0 ? (
              <Text style={styles.emptyText}>No habits created for {lifeAreaLabel} yet.</Text>
            ) : (
              <View style={styles.list}>
                {habitsForLifeArea.map(habit => (
                  <TouchableOpacity
                    key={habit.id}
                    style={styles.rowCard}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/habit-edit?id=${habit.id}` as any)}
                    testID={`aspiration-lifearea-habit-${habit.id}`}
                  >
                    <View style={styles.rowCardText}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {habit.title}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {habit.frequency === 'weekly' && habit.weekDays?.length
                          ? `Weekly on ${habit.weekDays
                              .slice()
                              .sort((a, b) => a - b)
                              .map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d])
                              .join(', ')}`
                          : 'Daily'}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  content: {
    flex: 1,
    paddingTop: 2,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 18,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  section: {
    marginTop: 10,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    paddingVertical: 12,
  },
  list: {
    gap: 10,
  },
  rowCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
  },
  rowCardText: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 20,
  },
  rowMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
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
