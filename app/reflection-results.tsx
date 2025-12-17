import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import Colors from '../constants/colors';
import type { ReflectionInsightsData, Todo } from '../types';
import ReflectionInsightsContent from '../components/ReflectionInsightsContent';

interface ReflectionData {
  tasks: string[];
  habits: string[];
  goals: string[];
}

const EMPTY_INSIGHTS: ReflectionInsightsData = {
  life_areas: [],
  goal_alignment: [],
  emotions: [],
  wins: [],
  energizers: [],
  drainers: [],
};

const normalizeInsights = (payload?: Partial<ReflectionInsightsData>): ReflectionInsightsData => ({
  life_areas: Array.isArray(payload?.life_areas) ? payload?.life_areas : [],
  goal_alignment: Array.isArray(payload?.goal_alignment) ? payload?.goal_alignment : [],
  emotions: Array.isArray(payload?.emotions) ? payload?.emotions : [],
  wins: Array.isArray(payload?.wins) ? payload?.wins : [],
  energizers: Array.isArray(payload?.energizers) ? payload?.energizers : [],
  drainers: Array.isArray(payload?.drainers) ? payload?.drainers : [],
});

export default function ReflectionResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { addTodo, state } = useAppState();

  const entryId = typeof params.entryId === 'string' ? params.entryId : undefined;

  const reflectionData: ReflectionData = useMemo(() => {
    const parseJsonParam = (param: string | string[] | undefined, fallback: string[] = []): string[] => {
      if (!param) return fallback;
      try {
        const parsed = JSON.parse(param as string);
        return Array.isArray(parsed) ? parsed : fallback;
      } catch (error) {
        console.error('[ReflectionResults] Failed to parse param', error);
        return fallback;
      }
    };

    return {
      tasks: parseJsonParam(params.tasks, []),
      habits: parseJsonParam(params.habits, []),
      goals: parseJsonParam(params.goals, []),
    };
  }, [params.tasks, params.habits, params.goals]);

  const entryInsights = useMemo(() => {
    if (!entryId) return undefined;
    return state.journalEntries.find(entry => entry.id === entryId)?.reflectionInsights;
  }, [entryId, state.journalEntries]);

  const parsedInsights = useMemo(() => {
    if (!params.insights) return entryInsights;
    try {
      return JSON.parse(params.insights as string) as ReflectionInsightsData;
    } catch (error) {
      console.error('[ReflectionResults] Failed to parse insights param', error);
      return entryInsights;
    }
  }, [entryInsights, params.insights]);

  const insightsData = useMemo(() => normalizeInsights(parsedInsights ?? EMPTY_INSIGHTS), [parsedInsights]);

  const reflectionSummary = useMemo(
    () => ({
      tasks: reflectionData.tasks,
      habits: reflectionData.habits,
      goals: reflectionData.goals,
    }),
    [reflectionData.goals, reflectionData.habits, reflectionData.tasks]
  );

  const hasActiveGoals = useMemo(
    () => state.goals.some(goal => !goal.completedAt && goal.status !== 'archived'),
    [state.goals]
  );

  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const normalizeTitle = (value: string) => value.trim().toLowerCase();

  const existingHabitTitles = useMemo(
    () => new Set(state.habits.map(habit => normalizeTitle(habit.title))),
    [state.habits]
  );

  const existingGoalTitles = useMemo(
    () => new Set(state.goals.map(goal => normalizeTitle(goal.title))),
    [state.goals]
  );

  const toggleTaskSelection = useCallback((taskTitle: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskTitle)) {
        newSet.delete(taskTitle);
      } else {
        newSet.add(taskTitle);
      }
      return newSet;
    });
  }, []);

  const handleHabitCreation = useCallback((habitTitle: string) => {
    if (!habitTitle) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: '/habit-setup',
      params: {
        habitTitle,
        fromReflection: 'true',
      },
    });
  }, [router]);

  const handleGoalCreation = useCallback((goalTitle: string) => {
    if (!goalTitle) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: '/goal-setup',
      params: {
        goalTitle,
        fromReflection: 'true',
      },
    });
  }, [router]);

  const handleDone = useCallback(() => {
    if (!addTodo) {
      console.error('[handleDone] addTodo is not available!');
      router.replace('/(tabs)/journal');
      return;
    }

    selectedTasks.forEach(taskTitle => {
      const task: Todo = {
        id: Date.now().toString() + '-' + Math.random(),
        title: taskTitle,
        completed: false,
        group: 'now',
        createdAt: new Date().toISOString(),
      };
      addTodo(task);
    });

    if (selectedTasks.size > 0 && Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setSelectedTasks(new Set());

    router.replace('/(tabs)/journal');
  }, [addTodo, router, selectedTasks]);

  const handleClose = useCallback(() => {
    router.replace('/(tabs)/journal');
  }, [router]);

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          presentation: 'modal',
        }} 
      />
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reflection Insights</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <ReflectionInsightsContent
            reflectionData={reflectionSummary}
            insights={insightsData}
            hasActiveGoals={hasActiveGoals}
            selectedTasks={selectedTasks}
            onToggleTaskSelection={toggleTaskSelection}
            onHabitAction={handleHabitCreation}
            onGoalAction={handleGoalCreation}
            isHabitAlreadyPlanned={title => existingHabitTitles.has(normalizeTitle(title))}
            isGoalAlreadyPlanned={title => existingGoalTitles.has(normalizeTitle(title))}
          />

          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleDone}
            testID="reflection-done-button"
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  doneButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
