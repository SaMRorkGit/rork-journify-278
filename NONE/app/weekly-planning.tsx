import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Platform, Animated, PanResponder } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, Sparkles, Plus, X, Heart, Briefcase, Activity, Wallet, Sprout, GripHorizontal, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { generateText } from '@rork-ai/toolkit-sdk';
import Colors from '../constants/colors';
import { useAppState } from '../contexts/AppStateContext';
import type { GoalTask, Habit, LifeArea } from '../types';
import { useToast } from '../contexts/ToastContext';

type Step = 1 | 2 | 3 | 4 | 5;

type WeeklyActionDraft = {
  id: string;
  title: string;
  type: 'goal-task' | 'habit';
  source: 'ai' | 'custom';
  trackingType?: Habit['trackingType'];
  frequency?: Habit['frequency'];
  weekDays?: number[];
  targetValue?: number;
  unit?: string;
};

type ActionSuggestion = {
  id: string;
  title: string;
  type: 'goal-task' | 'habit';
};

type ScheduledAssignment = {
  draftId: string;
  scheduledDayIndex: number;
  sequence: number;
};

type WeekDay = {
  index: number;
  label: string;
  shortLabel: string;
  iso: string;
};

const FEELING_OPTIONS = ['Calm', 'Focused', 'Balanced', 'Energized', 'Light', 'Creative', 'Strong'];

const LIFE_AREA_ICONS: Record<LifeArea, typeof Heart> = {
  relationship: Heart,
  career: Briefcase,
  health: Activity,
  finance: Wallet,
  growth: Sprout,
};

const createWeekDays = (): WeekDay[] => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const iso = date.toISOString().split('T')[0] ?? '';
    days.push({
      index: i,
      label: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      shortLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
      iso,
    });
  }
  return days;
};

export default function WeeklyPlanningScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, addGoalTask, addHabit, updateGoal } = useAppState();
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [reflection, setReflection] = useState('');
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  const [customFeeling, setCustomFeeling] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [suggestions, setSuggestions] = useState<ActionSuggestion[]>([]);
  const [selectedDrafts, setSelectedDrafts] = useState<WeeklyActionDraft[]>([]);
  const [scheduledAssignments, setScheduledAssignments] = useState<ScheduledAssignment[]>([]);
  const [customActionType, setCustomActionType] = useState<'goal-task' | 'habit'>('goal-task');
  const [customActionTitle, setCustomActionTitle] = useState('');
  const [suggestionError, setSuggestionError] = useState('');
  const activeGoals = useMemo(
    () => state.goals.filter(goal => !goal.completedAt && goal.status !== 'archived'),
    [state.goals]
  );
  const selectedGoal = useMemo(() => activeGoals.find(goal => goal.id === selectedGoalId), [activeGoals, selectedGoalId]);
  const weekDays = useMemo(() => createWeekDays(), []);

  const { mutate: fetchSuggestions, isPending: suggestionsPending } = useMutation({
    mutationFn: async () => {
      if (!selectedGoal) {
        throw new Error('Goal required');
      }
      const userGoals = state.userProfile?.goals?.join(', ') || 'personal growth';
      const prompt = `You are Journify's Action Step Generator.
Your role is to transform a user's goal and personal "why" into simple, achievable tasks and habits that help them build momentum.

Generate actions that follow these rules:

A. Principles
- Keep habits reasonably small based on the goal type
  - For meditation or focus activities: 2-5 minutes is great (hard to focus longer initially)
  - For physical activities (running, workout): 10-15 minutes makes sense
  - For learning/reading: 10-20 minutes is reasonable
  - For creative work: 15-30 minutes allows meaningful progress
- Make actions so easy the user can do them today
- No overwhelming or multi-step instructions
- Respect the user's why (motivation: "${userGoals}")
- Be gentle, encouraging, positive
- Align with Atomic Habits principles: Make it small, Make it easy, Make it obvious, Make it rewarding

B. Output Requirements
Provide:
- 2-3 one-time tasks (immediate actions)
- 2-3 simple habits (repeated actions)

Each action should be:
- Specific
- Observable
- Beginner-friendly
- Immediately doable
- Each action must fit in under 12 words

C. Behavior Rules
- Never suggest vague actions ("be more mindful", "be consistent")
- Never suggest anything too big unless the user already has advanced experience
- Avoid judgmental wording ("you should", "you need to")
- Actions should feel doable, kind, and non-pressuring

Goal: "${selectedGoal.title}"

Return ONLY a JSON object with two arrays: "tasks" and "habits".
Each should have "title" (string, max 12 words).

Example: {
  "tasks": [
    {"title": "Download a Spanish learning app"},
    {"title": "Find a Spanish podcast you enjoy"}
  ],
  "habits": [
    {"title": "Practice Spanish for 10 minutes daily"},
    {"title": "Learn 3 new Spanish words each morning"}
  ]
}`;
      const result = await generateText({ messages: [{ role: 'user', content: prompt }] });
      const match = result.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error('Unable to parse suggestions');
      }
      return JSON.parse(match[0]) as { tasks: { title: string }[]; habits: { title: string }[] };
    },
    onSuccess: data => {
      const combined: ActionSuggestion[] = [];
      data.tasks.forEach((task, index) => {
        combined.push({ id: `task-${task.title}-${index}`, title: task.title, type: 'goal-task' });
      });
      data.habits.forEach((habit, index) => {
        combined.push({ id: `habit-${habit.title}-${index}`, title: habit.title, type: 'habit' });
      });
      const trimmed = combined.slice(0, 5);
      setSuggestions(trimmed);
      setSuggestionError('');
    },
    onError: error => {
      console.error('[WeeklyPlanning] suggestion error', error);
      setSuggestionError('Could not fetch ideas. Try again.');
    },
  });

  useEffect(() => {
    if (step === 4 && selectedGoal && suggestions.length === 0 && !suggestionsPending) {
      fetchSuggestions();
    }
  }, [fetchSuggestions, selectedGoal, step, suggestions.length, suggestionsPending]);

  useEffect(() => {
    if (step === 5) {
      setScheduledAssignments(prev => {
        const existing = new Map(prev.map(item => [item.draftId, item]));
        return selectedDrafts.map((draft, index) => {
          const current = existing.get(draft.id);
          if (current) {
            return current;
          }
          return {
            draftId: draft.id,
            scheduledDayIndex: index % weekDays.length,
            sequence: index,
          };
        });
      });
    }
  }, [selectedDrafts, step, weekDays.length]);

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => ((prev - 1) as Step));
      return;
    }
    router.back();
  };

  const handleNext = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setStep(prev => ((prev + 1) as Step));
  };

  const toggleFeeling = (label: string) => {
    setSelectedFeelings(prev => {
      if (prev.includes(label)) {
        return prev.filter(item => item !== label);
      }
      return [...prev, label];
    });
  };

  const handleAddFeeling = () => {
    if (!customFeeling.trim()) {
      return;
    }
    setSelectedFeelings(prev => [...prev, customFeeling.trim()]);
    setCustomFeeling('');
  };

  const handleToggleSuggestion = (item: ActionSuggestion) => {
    setSelectedDrafts(prev => {
      const exists = prev.find(draft => draft.id === item.id);
      if (exists) {
        return prev.filter(draft => draft.id !== item.id);
      }
      return [
        ...prev,
        {
          id: item.id,
          title: item.title,
          type: item.type,
          source: 'ai',
          trackingType: 'checkbox',
          frequency: 'weekly',
          weekDays: [],
        },
      ];
    });
  };

  const handleAddCustomAction = () => {
    if (!customActionTitle.trim()) {
      return;
    }
    const id = `custom-${Date.now()}-${Math.random()}`;
    const draft: WeeklyActionDraft = {
      id,
      title: customActionTitle.trim(),
      type: customActionType,
      source: 'custom',
      trackingType: 'checkbox',
      frequency: customActionType === 'habit' ? 'weekly' : undefined,
      weekDays: [],
    };
    setSelectedDrafts(prev => [...prev, draft]);
    setCustomActionTitle('');
  };

  const handleRemoveDraft = (draftId: string) => {
    setSelectedDrafts(prev => prev.filter(draft => draft.id !== draftId));
    setScheduledAssignments(prev => prev.filter(item => item.draftId !== draftId));
  };

  const handleShiftAssignment = (draftId: string, shift: number) => {
    setScheduledAssignments(prev => prev.map(item => {
      if (item.draftId !== draftId) {
        return item;
      }
      const nextIndex = Math.min(Math.max(item.scheduledDayIndex + shift, 0), weekDays.length - 1);
      return {
        ...item,
        scheduledDayIndex: nextIndex,
        sequence: Date.now(),
      };
    }));
  };

  const handleDeleteAssignment = (draftId: string) => {
    handleRemoveDraft(draftId);
  };

  const handleConfirm = () => {
    if (!selectedGoal) {
      return;
    }
    const goalTaskIds: string[] = selectedGoal.goalTaskIds ?? [];
    const habitIds: string[] = selectedGoal.habitIds ?? [];
    const now = new Date().toISOString();
    const orderedAssignments = [...scheduledAssignments].sort((a, b) => a.sequence - b.sequence);
    orderedAssignments.forEach((assignment, index) => {
      const draft = selectedDrafts.find(item => item.id === assignment.draftId);
      if (!draft) {
        return;
      }
      const day = weekDays.find(item => item.index === assignment.scheduledDayIndex);
      if (!day) {
        return;
      }
      if (draft.type === 'goal-task') {
        const task: GoalTask = {
          id: `${selectedGoal.id}-weekly-task-${Date.now()}-${index}`,
          title: draft.title,
          completed: false,
          goalId: selectedGoal.id,
          dueDate: day.iso,
          createdAt: now,
        };
        addGoalTask(task);
        goalTaskIds.push(task.id);
        console.log('[WeeklyPlanning] added goal task', task);
      } else {
        const habit: Habit = {
          id: `${selectedGoal.id}-weekly-habit-${Date.now()}-${index}`,
          title: draft.title,
          frequency: 'weekly',
          weekDays: [assignment.scheduledDayIndex],
          trackingType: draft.trackingType ?? 'checkbox',
          targetValue: draft.targetValue,
          unit: draft.unit,
          completedDates: [],
          createdAt: now,
          goalId: selectedGoal.id,
        };
        addHabit(habit);
        habitIds.push(habit.id);
        console.log('[WeeklyPlanning] added habit', habit);
      }
    });
    updateGoal(selectedGoal.id, {
      goalTaskIds,
      habitIds,
    });
    showToast('Weekly plan scheduled');
    router.back();
  };

  const canProceed = () => {
    if (step === 1) {
      return reflection.trim().length > 0;
    }
    if (step === 2) {
      return selectedFeelings.length > 0;
    }
    if (step === 3) {
      return Boolean(selectedGoalId);
    }
    if (step === 4) {
      return selectedDrafts.length > 0;
    }
    if (step === 5) {
      return scheduledAssignments.length > 0;
    }
    return true;
  };

  const dayAssignments = weekDays.map(day => {
    const items = scheduledAssignments
      .filter(item => item.scheduledDayIndex === day.index)
      .sort((a, b) => a.sequence - b.sequence)
      .map(item => ({
        assignment: item,
        draft: selectedDrafts.find(draft => draft.id === item.draftId),
      }))
      .filter(payload => payload.draft !== undefined) as { assignment: ScheduledAssignment; draft: WeeklyActionDraft }[];
    return {
      day,
      items,
    };
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}
        testID="weekly-planning-screen"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} testID="weekly-planning-back">
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.centerHeader}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(step / 5) * 100}%` }]} />
            </View>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton} testID="weekly-planning-cancel">
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Weekly Reflection</Text>
              <Text style={styles.stepSubtitle}>What stood out to you from last week?</Text>
              <TextInput
                style={[styles.textArea]}
                placeholder="Write a quick note..."
                placeholderTextColor={Colors.textSecondary}
                value={reflection}
                onChangeText={setReflection}
                multiline
                textAlignVertical="top"
                testID="weekly-reflection-input"
              />
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Feeling Check-in</Text>
              <Text style={styles.stepSubtitle}>How do you want this week to feel?</Text>
              <View style={styles.chipGrid}>
                {FEELING_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.chip, selectedFeelings.includes(option) && styles.chipSelected]}
                    onPress={() => toggleFeeling(option)}
                    testID={`feeling-chip-${option}`}
                  >
                    <Text style={[styles.chipText, selectedFeelings.includes(option) && styles.chipTextSelected]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customFeelingRow}>
                <TextInput
                  style={styles.customFeelingInput}
                  placeholder="Add your own"
                  placeholderTextColor={Colors.textSecondary}
                  value={customFeeling}
                  onChangeText={setCustomFeeling}
                />
                <TouchableOpacity style={styles.addCustomButton} onPress={handleAddFeeling} testID="add-custom-feeling">
                  <Plus size={16} color={Colors.background} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Pick Your Focus Goal</Text>
              <Text style={styles.stepSubtitle}>What do you want to focus on this week?</Text>
              {activeGoals.length === 0 && (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No goals yet</Text>
                  <Text style={styles.emptySubtitle}>Create a goal to start planning your week.</Text>
                </View>
              )}
              {activeGoals.map(goal => {
                const IconComponent = goal.lifeArea ? LIFE_AREA_ICONS[goal.lifeArea] : Heart;
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[styles.goalCard, selectedGoalId === goal.id && styles.goalCardSelected]}
                    onPress={() => setSelectedGoalId(goal.id)}
                    testID={`weekly-goal-card-${goal.id}`}
                  >
                    <View style={styles.goalHeader}>
                      <View style={styles.goalIconBadge}>
                        <IconComponent size={18} color={Colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.goalTitle}>{goal.title}</Text>
                        {goal.why ? <Text style={styles.goalWhy} numberOfLines={2}>{goal.why}</Text> : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {step === 4 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Suggested Actions</Text>
              <Text style={styles.stepSubtitle}>Here are a few small steps to move this forward.</Text>
              {suggestionsPending && (
                <View style={styles.loadingCard}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.loadingText}>Personalizing ideas...</Text>
                </View>
              )}
              {suggestionError ? <Text style={styles.errorText}>{suggestionError}</Text> : null}
              {suggestions.map(item => {
                const isSelected = selectedDrafts.some(draft => draft.id === item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.suggestionCard, isSelected && styles.suggestionCardSelected]}
                    onPress={() => handleToggleSuggestion(item)}
                    testID={`weekly-suggestion-${item.id}`}
                  >
                    <View style={styles.suggestionLeft}>
                      <Sparkles size={18} color={Colors.primary} />
                      <Text style={styles.suggestionText}>{item.title}</Text>
                    </View>
                    <View style={[styles.typeBadge, item.type === 'habit' ? styles.habitBadge : styles.taskBadge]}>
                      <Text style={styles.typeBadgeText}>{item.type === 'habit' ? 'Habit' : 'Task'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View style={styles.selectedSummary}>
                <Text style={styles.selectedCount}>{selectedDrafts.length} selected</Text>
                <TouchableOpacity onPress={() => setSelectedDrafts([])} disabled={selectedDrafts.length === 0}>
                  <Text style={[styles.clearSelectionText, selectedDrafts.length === 0 && styles.disabledText]}>Clear</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.customActionContainer}>
                <View style={styles.actionToggle}>
                  <TouchableOpacity
                    style={[styles.actionToggleButton, customActionType === 'goal-task' && styles.actionToggleButtonActive]}
                    onPress={() => setCustomActionType('goal-task')}
                  >
                    <Text style={[styles.actionToggleText, customActionType === 'goal-task' && styles.actionToggleTextActive]}>Task</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionToggleButton, customActionType === 'habit' && styles.actionToggleButtonActive]}
                    onPress={() => setCustomActionType('habit')}
                  >
                    <Text style={[styles.actionToggleText, customActionType === 'habit' && styles.actionToggleTextActive]}>Habit</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.addActionRow}>
                  <TextInput
                    style={styles.addActionInput}
                    placeholder="Add your own idea"
                    placeholderTextColor={Colors.textSecondary}
                    value={customActionTitle}
                    onChangeText={setCustomActionTitle}
                    testID="weekly-custom-action-input"
                  />
                  <TouchableOpacity style={styles.addActionButton} onPress={handleAddCustomAction} testID="weekly-custom-action-add">
                    <Plus size={18} color={Colors.background} />
                  </TouchableOpacity>
                </View>
              </View>
              {selectedDrafts.map(draft => (
                <View key={draft.id} style={styles.selectedChip}>
                  <Text style={styles.selectedChipText}>{draft.title}</Text>
                  <TouchableOpacity onPress={() => handleRemoveDraft(draft.id)}>
                    <X size={16} color={Colors.text} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {step === 5 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Week Overview</Text>
              <Text style={styles.stepSubtitle}>Here’s your gentle plan for this week.</Text>
              <View style={styles.weekRow}>
                {weekDays.map(day => (
                  <View key={day.index} style={styles.weekRowItem}>
                    <Text style={styles.weekRowLabel}>{day.shortLabel}</Text>
                    <Text style={styles.weekRowSub}>{day.label.split(' ').slice(1).join(' ')}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.dragHint}>Drag sideways to shift a task to a new day.</Text>
              <View style={styles.board}>
                {dayAssignments.map(({ day, items }) => (
                  <View key={day.index} style={styles.boardColumn}>
                    <Text style={styles.boardColumnLabel}>{day.label}</Text>
                    {items.length === 0 && (
                      <View style={styles.emptySlot}>
                        <Text style={styles.emptySlotText}>Drop here</Text>
                      </View>
                    )}
                    {items.map(payload => (
                      <PlannedActionCard
                        key={payload.assignment.draftId}
                        assignment={payload.assignment}
                        draft={payload.draft}
                        onShift={handleShiftAssignment}
                        onDelete={handleDeleteAssignment}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          {step < 5 ? (
            <TouchableOpacity
              style={[styles.primaryButton, !canProceed() && styles.buttonDisabled]}
              onPress={handleNext}
              disabled={!canProceed()}
              testID="weekly-next-button"
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, !canProceed() && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={!canProceed()}
              testID="weekly-confirm-button"
            >
              <Text style={styles.primaryButtonText}>Confirm Plan</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
}

type PlannedActionCardProps = {
  draft: WeeklyActionDraft;
  assignment: ScheduledAssignment;
  onShift: (draftId: string, shift: number) => void;
  onDelete: (draftId: string) => void;
};

function PlannedActionCard({ draft, assignment, onShift, onDelete }: PlannedActionCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 6,
        onPanResponderMove: (_, gesture) => {
          translateX.setValue(gesture.dx);
        },
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) > 40) {
            const shift = gesture.dx > 0 ? 1 : -1;
            onShift(assignment.draftId, shift);
            if (Platform.OS !== 'web') {
              Haptics.selectionAsync();
            }
          }
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        },
      }),
    [assignment.draftId, onShift, translateX],
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.planCard, { transform: [{ translateX }] }]}
      testID={`weekly-plan-card-${assignment.draftId}`}
    >
      <View style={styles.planCardLeft}>
        <GripHorizontal size={16} color={Colors.textSecondary} />
        <View>
          <Text style={styles.planCardTitle}>{draft.title}</Text>
          <Text style={styles.planCardType}>{draft.type === 'habit' ? 'Habit' : 'Task'}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => onDelete(assignment.draftId)} testID={`weekly-plan-delete-${assignment.draftId}`}>
        <Trash2 size={18} color={Colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
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
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  centerHeader: {
    flex: 1,
    alignItems: 'center',
  },
  progressBar: {
    height: 4,
    width: 200,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  cancelButton: {
    padding: 4,
    width: 60,
    alignItems: 'flex-end',
  },
  cancelText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContainer: {
    paddingTop: 12,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  textArea: {
    minHeight: 140,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.text,
    fontSize: 14,
  },
  chipTextSelected: {
    color: Colors.background,
    fontWeight: '600',
  },
  customFeelingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  customFeelingInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.text,
  },
  addCustomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  goalCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginBottom: 12,
  },
  goalCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  goalHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  goalIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  goalWhy: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  loadingText: {
    color: Colors.text,
    fontSize: 15,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  suggestionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  suggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  suggestionText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  taskBadge: {
    backgroundColor: 'rgba(74, 157, 255, 0.2)',
  },
  habitBadge: {
    backgroundColor: 'rgba(175, 155, 255, 0.2)',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  errorText: {
    color: Colors.error,
    marginBottom: 12,
  },
  selectedSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  selectedCount: {
    color: Colors.text,
    fontSize: 14,
  },
  clearSelectionText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.4,
  },
  customActionContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    backgroundColor: Colors.surface,
    marginBottom: 16,
  },
  actionToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  actionToggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  actionToggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  actionToggleText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  actionToggleTextActive: {
    color: Colors.background,
  },
  addActionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  addActionInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.text,
  },
  addActionButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  selectedChipText: {
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weekRowItem: {
    alignItems: 'center',
    flex: 1,
  },
  weekRowLabel: {
    color: Colors.text,
    fontWeight: '600',
  },
  weekRowSub: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  dragHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  boardColumn: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 12,
  },
  boardColumnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  emptySlot: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  emptySlotText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    padding: 12,
    marginBottom: 10,
  },
  planCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  planCardTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  planCardType: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  bottomSpacer: {
    height: 40,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  primaryButton: {
    borderRadius: 14,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
