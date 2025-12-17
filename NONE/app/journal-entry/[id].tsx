import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Check, ChevronLeft, PenSquare } from 'lucide-react-native';
import Colors from '../../constants/colors';
import { useAppState } from '../../contexts/AppStateContext';
import { useToast } from '../../contexts/ToastContext';
import ReflectionInsightsContent from '../../components/ReflectionInsightsContent';
import type { MoodType, ReflectionInsightsData, Todo } from '../../types';

const moodEmojiMap: Record<MoodType, string> = {
  great: '😃',
  fine: '😊',
  neutral: '😐',
  stressed: '😖',
  low: '😢',
};

const EMPTY_INSIGHTS: ReflectionInsightsData = {
  life_areas: [],
  goal_alignment: [],
  emotions: [],
  wins: [],
  energizers: [],
  drainers: [],
};

export default function JournalEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const { state, updateJournalEntry, addTodo } = useAppState();
  const { showToast } = useToast();

  const entry = state.journalEntries.find(item => item.id === params.id);

  const [activeTab, setActiveTab] = useState<'entry' | 'insights'>('entry');
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(entry?.content ?? '');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDraftText(entry?.content ?? '');
  }, [entry?.content]);

  const normalizeTitle = useCallback((value: string) => value.trim().toLowerCase(), []);

  const existingHabitTitles = useMemo(
    () => new Set(state.habits.map(habit => normalizeTitle(habit.title))),
    [normalizeTitle, state.habits]
  );

  const existingGoalTitles = useMemo(
    () => new Set(state.goals.map(goal => normalizeTitle(goal.title))),
    [normalizeTitle, state.goals]
  );

  const reflectionSummary = useMemo(
    () => ({
      tasks: entry?.extractedTodos ?? [],
      habits: entry?.extractedHabits ?? [],
      goals: entry?.extractedGoals ?? [],
    }),
    [entry?.extractedGoals, entry?.extractedHabits, entry?.extractedTodos]
  );

  const insightsData = useMemo(
    () => entry?.reflectionInsights ?? EMPTY_INSIGHTS,
    [entry?.reflectionInsights]
  );

  const hasActiveGoals = useMemo(
    () => state.goals.some(goal => !goal.completedAt && goal.status !== 'archived'),
    [state.goals]
  );

  const formattedTimestamp = useMemo(() => {
    if (!entry) return '';
    const date = new Date(entry.createdAt);
    return `${date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })} • ${date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  }, [entry]);

  const toggleTaskSelection = useCallback((taskTitle: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskTitle)) {
        next.delete(taskTitle);
      } else {
        next.add(taskTitle);
      }
      return next;
    });
  }, []);

  const handleHabitCreation = useCallback((habitTitle: string) => {
    if (!habitTitle) return;
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
    router.push({
      pathname: '/goal-setup',
      params: {
        goalTitle,
        fromReflection: 'true',
      },
    });
  }, [router]);

  const handleApplySelectedTasks = useCallback(() => {
    if (!addTodo) {
      showToast('Adding tasks is unavailable right now.', { type: 'info' });
      return;
    }
    if (selectedTasks.size === 0) {
      showToast('Select a task to add it to Today.', { type: 'info' });
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
    setSelectedTasks(new Set());
    showToast('Tasks added to Today');
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [addTodo, selectedTasks, showToast]);

  const handleSaveEdit = useCallback(() => {
    if (!entry) return;
    const trimmed = draftText.trim();
    if (!trimmed) {
      showToast('Please add some text before saving.', { type: 'info' });
      return;
    }
    updateJournalEntry(entry.id, { content: trimmed });
    setIsEditing(false);
    showToast('Journal updated');
  }, [draftText, entry, showToast, updateJournalEntry]);

  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      handleSaveEdit();
      return;
    }
    setIsEditing(true);
  }, [handleSaveEdit, isEditing]);

  const handleCancelEdit = useCallback(() => {
    setDraftText(entry?.content ?? '');
    setIsEditing(false);
  }, [entry?.content]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (!entry) {
    return (
      <View style={[styles.missingContainer, { paddingTop: insets.top + 40 }]}>
        <Text style={styles.missingTitle}>Entry not found</Text>
        <Text style={styles.missingSubtitle}>This journal may have been removed.</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/journal')} style={styles.missingButton}>
          <Text style={styles.missingButtonText}>Back to Journal</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const moodEmoji = entry.mood ? moodEmojiMap[entry.mood] : null;
  const isApplyDisabled = selectedTasks.size === 0;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}
        testID="journal-entry-screen"
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={10}
            testID="journal-entry-back"
          >
            <ChevronLeft size={22} color={Colors.text} />
            <Text style={styles.backLabel}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Journal Entry</Text>
          <TouchableOpacity
            onPress={handleEditToggle}
            style={[styles.editButton, isEditing && styles.editButtonActive]}
            testID="journal-entry-edit"
          >
            {isEditing ? <Check size={18} color={Colors.surface} /> : <PenSquare size={18} color={Colors.surface} />}
            <Text style={styles.editLabel}>{isEditing ? 'Save' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metaCard}>
          <View style={styles.metaTextGroup}>
            <Text style={styles.metaLabel}>Captured</Text>
            <Text style={styles.metaValue}>{formattedTimestamp}</Text>
          </View>
          {moodEmoji ? (
            <View style={styles.moodBadge}>
              <Text style={styles.moodEmoji}>{moodEmoji}</Text>
              <Text style={styles.moodText}>{entry.mood?.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.tabSwitch}>
          {(['entry', 'insights'] as const).map(tab => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                testID={`journal-entry-tab-${tab}`}
              >
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab === 'entry' ? 'Entry' : 'Insights'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === 'entry' ? (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.entryCard}>
              <Text style={styles.entryHeading}>Reflection</Text>
              {isEditing ? (
                <View style={styles.inputWrapper}>
                  <TextInput
                    value={draftText}
                    onChangeText={setDraftText}
                    multiline
                    style={styles.entryInput}
                    placeholder="Update your reflection..."
                    placeholderTextColor={Colors.textSecondary}
                    textAlignVertical="top"
                    testID="journal-entry-edit-input"
                  />
                  <View style={styles.editActionsRow}>
                    <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton} testID="journal-entry-cancel-edit">
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={styles.entryText}>{entry.content}</Text>
              )}
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
            showsVerticalScrollIndicator={false}
          >
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
              onPress={handleApplySelectedTasks}
              style={[styles.applyButton, isApplyDisabled && styles.applyButtonDisabled]}
              disabled={isApplyDisabled}
              testID="journal-entry-apply-tasks"
            >
              {isApplyDisabled ? (
                <Text style={styles.applyButtonTextMuted}>Select tasks to add them</Text>
              ) : (
                <Text style={styles.applyButtonText}>Add selected tasks to Today</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backLabel: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editButtonActive: {
    backgroundColor: Colors.accent,
  },
  editLabel: {
    color: Colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  metaCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  metaTextGroup: {
    gap: 4,
  },
  metaLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metaValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(50, 208, 193, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  moodEmoji: {
    fontSize: 20,
  },
  moodText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  tabSwitch: {
    backgroundColor: Colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: Colors.surface,
  },
  scrollArea: {
    flex: 1,
  },
  entryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 200,
  },
  entryHeading: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 12,
    fontWeight: '600',
  },
  entryText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  inputWrapper: {
    gap: 12,
  },
  entryInput: {
    minHeight: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    lineHeight: 22,
    backgroundColor: Colors.background,
  },
  editActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  applyButton: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  applyButtonDisabled: {
    backgroundColor: Colors.border,
    borderColor: Colors.border,
  },
  applyButtonText: {
    color: Colors.surface,
    fontWeight: '600',
    fontSize: 15,
  },
  applyButtonTextMuted: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  missingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: Colors.background,
  },
  missingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  missingSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  missingButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  missingButtonText: {
    color: Colors.surface,
    fontWeight: '600',
  },
});
