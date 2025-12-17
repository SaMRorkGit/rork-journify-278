import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, X, CheckCircle2, RefreshCw, Sparkles, Hash, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { generateText } from '@rork-ai/toolkit-sdk';

import Colors from '../constants/colors';
import { useAppState } from '../contexts/AppStateContext';
import type { Habit, GoalTask } from '../types';

type ActionItem = {
  type: 'goal-task' | 'habit';
  title: string;
  frequency?: 'daily' | 'weekly';
  weekDays?: number[];
  trackingType?: 'checkbox' | 'numeric' | 'time';
  targetValue?: number;
  unit?: string;
};

export default function GoalActionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goalId = useMemo(() => {
    if (Array.isArray(id)) return id[0];
    return id;
  }, [id]);
  const { state, addGoalTask, addHabit, updateGoal } = useAppState();
  const goal = state.goals.find((g) => g.id === goalId);
  const [actionType, setActionType] = useState<'goal-task' | 'habit'>('goal-task');
  const [actionInput, setActionInput] = useState('');
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<{ tasks: string[]; habits: string[] }>({ tasks: [], habits: [] });
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null);
  const [tempHabitData, setTempHabitData] = useState<ActionItem | null>(null);
  const [suggestionError, setSuggestionError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const linkedAspirationId = goal?.aspirationId ?? goal?.aspirationIds?.[0];
  const linkedAspiration = state.aspirations.find((aspiration) => aspiration.id === linkedAspirationId);
  const lifeArea = goal?.lifeArea ?? linkedAspiration?.lifeArea;

  const pathMutation = useMutation({
    mutationFn: async () => {
      if (!goal) {
        throw new Error('Goal not found');
      }

      const contextWhy = goal.why || 'This matters to me because it reflects who I want to become.';
      const prompt = `You are Journify's Action Step Generator. Help me add simple, meaningful steps for this existing goal. Goal Title: "${goal.title}". Why: "${contextWhy}".` +
`\nGenerate 2-3 one-time tasks and 2-3 supportive habits that align with Atomic Habits principles. Keep every action under 12 words.` +
`\nReturn ONLY JSON matching {"tasks":[{"title":string}],"habits":[{"title":string}]}.`;

      const result = await generateText({
        messages: [{ role: 'user', content: prompt }],
      });
      const match = result.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error('Unable to parse suggestions');
      }
      return JSON.parse(match[0]) as { tasks: { title: string }[]; habits: { title: string }[] };
    },
    onSuccess: (data) => {
      setSuggestionError('');
      setAiSuggestions({
        tasks: data.tasks.map((item) => item.title),
        habits: data.habits.map((item) => item.title),
      });
    },
    onError: (error) => {
      console.error('[GoalActions] Suggestion error', error);
      setSuggestionError('Could not fetch suggestions. Try again in a moment.');
    },
  });

  const handleAddAction = () => {
    if (!actionInput.trim()) {
      return;
    }

    const newAction: ActionItem = {
      type: actionType,
      title: actionInput.trim(),
      frequency: 'daily',
      trackingType: 'checkbox',
      weekDays: [],
    };

    console.log('[GoalActions] Creating draft action', newAction);
    setActions((prev) => [...prev, newAction]);
    setActionInput('');

    if (actionType === 'habit') {
      setTempHabitData(newAction);
      setEditingActionIndex(actions.length);
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleAddSuggestion = (suggestion: string, type: 'goal-task' | 'habit') => {
    if (actions.find((action) => action.title === suggestion)) {
      return;
    }

    const newAction: ActionItem = {
      type,
      title: suggestion,
      frequency: 'daily',
      trackingType: 'checkbox',
      weekDays: [],
    };

    console.log('[GoalActions] Adding suggestion', { suggestion, type });
    setActions((prev) => [...prev, newAction]);

    if (type === 'habit') {
      setTempHabitData(newAction);
      setEditingActionIndex(actions.length);
    }

    setAiSuggestions((prev) => ({
      tasks: type === 'goal-task' ? prev.tasks.filter((task) => task !== suggestion) : prev.tasks,
      habits: type === 'habit' ? prev.habits.filter((habit) => habit !== suggestion) : prev.habits,
    }));
  };

  const handleRemoveAction = (index: number) => {
    setActions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const openHabitEdit = (index: number) => {
    const action = actions[index];
    if (action?.type === 'habit') {
      setTempHabitData({ ...action });
      setEditingActionIndex(index);
    }
  };

  const handleSaveHabitConfig = () => {
    if (editingActionIndex === null || !tempHabitData) {
      return;
    }

    setActions((prev) => prev.map((action, index) => (index === editingActionIndex ? tempHabitData : action)));
    setEditingActionIndex(null);
    setTempHabitData(null);
  };

  const handleCancelHabitConfig = () => {
    setEditingActionIndex(null);
    setTempHabitData(null);
  };

  const handleSaveActions = async () => {
    if (!goal || actions.length === 0 || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      const createdTaskIds: string[] = [];
      const createdHabitIds: string[] = [];

      actions.forEach((action, index) => {
        if (action.type === 'goal-task') {
          const newTask: GoalTask = {
            id: `${goal.id}-task-${Date.now()}-${index}`,
            title: action.title,
            completed: false,
            goalId: goal.id,
            dueDate: undefined,
            createdAt: new Date().toISOString(),
          };
          addGoalTask(newTask);
          createdTaskIds.push(newTask.id);
        } else {
          const newHabit: Habit = {
            id: `${goal.id}-habit-${Date.now()}-${index}`,
            title: action.title,
            frequency: action.frequency || 'daily',
            weekDays: action.weekDays,
            trackingType: action.trackingType || 'checkbox',
            targetValue: action.targetValue,
            unit: action.unit,
            completedDates: [],
            createdAt: new Date().toISOString(),
            goalId: goal.id,
            aspirationId: linkedAspirationId,
            lifeArea,
          };
          addHabit(newHabit);
          createdHabitIds.push(newHabit.id);
        }
      });

      updateGoal(goal.id, {
        goalTaskIds: [...(goal.goalTaskIds ?? []), ...createdTaskIds],
        habitIds: [...(goal.habitIds ?? []), ...createdHabitIds],
      });

      console.log('[GoalActions] Saved actions', {
        goalId: goal.id,
        tasks: createdTaskIds.length,
        habits: createdHabitIds.length,
      });

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      router.back();
    } catch (error) {
      console.error('[GoalActions] Failed to save actions', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!goal) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Goal not found</Text>
          <Text style={styles.emptyStateText}>Return and pick a goal to add actions.</Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={() => router.back()}>
            <Text style={styles.emptyStateButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.centerHeader}>
            <Text style={styles.headerLabel}>Actions</Text>
          </View>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.stepContainer}>
            <Text style={styles.stepHeaderTitle}>Actions</Text>
            <Text style={styles.stepTitle}>Add supportive steps for “{goal.title}”</Text>
            <Text style={styles.stepSubtext}>Tasks and habits you add will stay linked to this goal.</Text>

            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, actionType === 'goal-task' && styles.toggleButtonActive]}
                onPress={() => setActionType('goal-task')}
              >
                <Text style={[styles.toggleButtonText, actionType === 'goal-task' && styles.toggleButtonTextActive]}>Task</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, actionType === 'habit' && styles.toggleButtonActive]}
                onPress={() => setActionType('habit')}
              >
                <Text style={[styles.toggleButtonText, actionType === 'habit' && styles.toggleButtonTextActive]}>Habit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.addActionContainer}>
              <TextInput
                style={styles.actionInput}
                placeholder="Type an action..."
                placeholderTextColor={Colors.textSecondary}
                value={actionInput}
                onChangeText={setActionInput}
                onSubmitEditing={handleAddAction}
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddAction} testID="actions-inline-add">
                <Plus size={20} color={Colors.surface} />
              </TouchableOpacity>
            </View>

            {actions.map((action, index) => (
              <TouchableOpacity
                key={`${action.title}-${index}`}
                style={styles.actionCard}
                onPress={() => openHabitEdit(index)}
                disabled={action.type !== 'habit'}
              >
                <View style={styles.actionIconWrapper}>
                  {action.type === 'goal-task' ? (
                    <CheckCircle2 size={18} color={Colors.primary} />
                  ) : (
                    <RefreshCw size={18} color={Colors.accent} />
                  )}
                </View>
                <View style={styles.actionCardContent}>
                  <Text style={styles.actionTypeLabel}>{action.type === 'goal-task' ? 'Task' : 'Habit'}</Text>
                  <Text style={styles.actionText}>{action.title}</Text>
                  {action.type === 'habit' && (
                    <Text style={styles.habitDetailsText}>
                      {(action.frequency === 'daily' ? 'Daily' : 'Weekly')}
                      {action.frequency === 'weekly' && action.weekDays?.length ? ` on ${action.weekDays.map((d) => WEEK_DAYS[d]).join(', ')}` : ''}
                      {action.trackingType === 'numeric' && action.targetValue ? ` • Target ${action.targetValue} ${action.unit ?? ''}` : ''}
                      {action.trackingType === 'time' && action.targetValue ? ` • ${action.targetValue} min` : ''}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleRemoveAction(index)}>
                  <X size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            {aiSuggestions.tasks.length === 0 && aiSuggestions.habits.length === 0 && (
              <TouchableOpacity
                style={styles.pathButton}
                onPress={() => pathMutation.mutate()}
                disabled={pathMutation.isPending}
              >
                <Sparkles size={16} color={Colors.primary} />
                <Text style={styles.pathButtonText}>
                  {pathMutation.isPending ? 'Finding ideas...' : 'Suggest ideas for me'}
                </Text>
              </TouchableOpacity>
            )}

            {suggestionError ? <Text style={styles.errorText}>{suggestionError}</Text> : null}

            {pathMutation.isPending && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>Curating small steps...</Text>
              </View>
            )}

            {(aiSuggestions.tasks.length > 0 || aiSuggestions.habits.length > 0) && (
              <View style={styles.suggestionsSection}>
                <Text style={styles.suggestionsTitle}>Inspired ideas</Text>
                {aiSuggestions.tasks.map((suggestion, index) => (
                  <TouchableOpacity
                    key={`task-${index}`}
                    style={styles.suggestionCard}
                    onPress={() => handleAddSuggestion(suggestion, 'goal-task')}
                  >
                    <View style={styles.suggestionIconWrapper}>
                      <CheckCircle2 size={16} color={Colors.primary} />
                    </View>
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                    <Plus size={18} color={Colors.primary} />
                  </TouchableOpacity>
                ))}
                {aiSuggestions.habits.map((suggestion, index) => (
                  <TouchableOpacity
                    key={`habit-${index}`}
                    style={styles.suggestionCard}
                    onPress={() => handleAddSuggestion(suggestion, 'habit')}
                  >
                    <View style={styles.suggestionIconWrapper}>
                      <RefreshCw size={16} color={Colors.accent} />
                    </View>
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                    <Plus size={18} color={Colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={[styles.nextButton, (actions.length === 0 || isSaving) && styles.buttonDisabled]}
            onPress={handleSaveActions}
            disabled={actions.length === 0 || isSaving}
            testID="actions-save-button"
          >
            <Text style={styles.nextButtonText}>{isSaving ? 'Saving...' : 'Add to Goal'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {editingActionIndex !== null && tempHabitData && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Edit Habit</Text>
              <TouchableOpacity onPress={handleCancelHabitConfig}>
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Habit Name</Text>
                <TextInput
                  style={styles.input}
                  value={tempHabitData.title}
                  onChangeText={(text) => setTempHabitData({ ...tempHabitData, title: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Frequency</Text>
                <View style={styles.segmentControl}>
                  <TouchableOpacity
                    style={[styles.segmentButton, tempHabitData.frequency === 'daily' && styles.segmentButtonActive]}
                    onPress={() => setTempHabitData({ ...tempHabitData, frequency: 'daily', weekDays: [] })}
                  >
                    <Text style={[styles.segmentText, tempHabitData.frequency === 'daily' && styles.segmentTextActive]}>Daily</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segmentButton, tempHabitData.frequency === 'weekly' && styles.segmentButtonActive]}
                    onPress={() => setTempHabitData({ ...tempHabitData, frequency: 'weekly' })}
                  >
                    <Text style={[styles.segmentText, tempHabitData.frequency === 'weekly' && styles.segmentTextActive]}>Weekly</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {tempHabitData.frequency === 'weekly' && (
                <View style={styles.weekDaysContainer}>
                  <Text style={styles.weekDaysLabel}>Select days:</Text>
                  <View style={styles.weekDaysRow}>
                    {WEEK_DAYS.map((day, index) => {
                      const isSelected = tempHabitData.weekDays?.includes(index);
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[styles.weekDayButton, isSelected && styles.weekDayButtonSelected]}
                          onPress={() => {
                            const current = tempHabitData.weekDays || [];
                            const updated = isSelected ? current.filter((d) => d !== index) : [...current, index];
                            setTempHabitData({ ...tempHabitData, weekDays: updated });
                          }}
                        >
                          <Text style={[styles.weekDayText, isSelected && styles.weekDayTextSelected]}>{day}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tracking Method</Text>
                <View style={styles.trackingOptions}>
                  <TouchableOpacity
                    style={[styles.trackingOptionCard, tempHabitData.trackingType === 'checkbox' && styles.trackingOptionCardSelected]}
                    onPress={() => setTempHabitData({ ...tempHabitData, trackingType: 'checkbox', targetValue: undefined, unit: undefined })}
                  >
                    <CheckCircle2 size={20} color={tempHabitData.trackingType === 'checkbox' ? Colors.primary : Colors.textSecondary} />
                    <View style={styles.trackingOptionTextContainer}>
                      <Text style={styles.trackingOptionTitle}>Done / Not Done</Text>
                      <Text style={styles.trackingOptionDescription}>Simple completion tracker</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.trackingOptionCard, tempHabitData.trackingType === 'numeric' && styles.trackingOptionCardSelected]}
                    onPress={() => setTempHabitData({ ...tempHabitData, trackingType: 'numeric' })}
                  >
                    <Hash size={20} color={tempHabitData.trackingType === 'numeric' ? Colors.primary : Colors.textSecondary} />
                    <View style={styles.trackingOptionTextContainer}>
                      <Text style={styles.trackingOptionTitle}>Numeric Value</Text>
                      <Text style={styles.trackingOptionDescription}>Track reps, pages, cups...</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.trackingOptionCard, tempHabitData.trackingType === 'time' && styles.trackingOptionCardSelected]}
                    onPress={() => setTempHabitData({ ...tempHabitData, trackingType: 'time' })}
                  >
                    <Clock size={20} color={tempHabitData.trackingType === 'time' ? Colors.primary : Colors.textSecondary} />
                    <View style={styles.trackingOptionTextContainer}>
                      <Text style={styles.trackingOptionTitle}>Time Spent</Text>
                      <Text style={styles.trackingOptionDescription}>Track minutes invested</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {tempHabitData.trackingType === 'numeric' && (
                <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Target</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 10"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="numeric"
                      value={tempHabitData.targetValue?.toString() ?? ''}
                      onChangeText={(text) => setTempHabitData({ ...tempHabitData, targetValue: text ? Number(text) : undefined })}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Unit</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., pages"
                      placeholderTextColor={Colors.textSecondary}
                      value={tempHabitData.unit ?? ''}
                      onChangeText={(text) => setTempHabitData({ ...tempHabitData, unit: text })}
                    />
                  </View>
                </View>
              )}

              {tempHabitData.trackingType === 'time' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Target Minutes</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 15"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="numeric"
                    value={tempHabitData.targetValue?.toString() ?? ''}
                    onChangeText={(text) => setTempHabitData({ ...tempHabitData, targetValue: text ? Number(text) : undefined })}
                  />
                </View>
              )}

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveHabitConfig}>
                <Text style={styles.saveButtonText}>Save Habit</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}
    </>
  );
}

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cancelButton: {
    padding: 4,
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
  stepHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  stepSubtext: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  toggleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toggleButtonTextActive: {
    color: Colors.surface,
  },
  addActionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardContent: {
    flex: 1,
  },
  actionTypeLabel: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  actionText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  habitDetailsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  pathButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginTop: 8,
  },
  pathButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    marginTop: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginTop: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.text,
  },
  suggestionsSection: {
    marginTop: 24,
    gap: 8,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  suggestionCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  suggestionIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  inputGroup: {
    marginBottom: 16,
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.surface,
    fontWeight: '600',
  },
  weekDaysContainer: {
    gap: 12,
  },
  weekDaysLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  weekDayButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weekDayButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  weekDayTextSelected: {
    color: Colors.surface,
  },
  trackingOptions: {
    gap: 12,
  },
  trackingOptionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackingOptionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  trackingOptionTextContainer: {
    flex: 1,
  },
  trackingOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  trackingOptionDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyStateButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
