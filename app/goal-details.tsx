import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, ActivityIndicator, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, CheckCircle2, Circle, RefreshCw, Pencil, Trash2, Heart, Briefcase, Activity, Wallet, Sprout, ChevronDown, ChevronRight, Sparkles, Archive, MoreVertical } from 'lucide-react-native';
import { useState, useMemo, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useMutation } from '@tanstack/react-query';
import { generateText } from '@rork-ai/toolkit-sdk';

import { useAppState } from '../contexts/AppStateContext';
import Colors from '../constants/colors';
import ConfirmationModal from '../components/ConfirmationModal';
import { getLifeAreaLabel, resolveGoalLifeArea } from '../constants/life-area-helpers';
import type { JournalEntry, LifeArea } from '../types';

const LIFE_AREA_CONFIG = {
  relationship: { icon: Heart, color: '#FF7FA5', label: 'Relationship' },
  career: { icon: Briefcase, color: '#4A9DFF', label: 'Career' },
  health: { icon: Activity, color: '#47c447', label: 'Health' },
  finance: { icon: Wallet, color: '#FFC857', label: 'Finance' },
  growth: { icon: Sprout, color: '#AF9BFF', label: 'Growth' },
};

const LIFE_AREA_OPTIONS: LifeArea[] = ['relationship', 'career', 'health', 'finance', 'growth'];

export default function GoalDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { 
    state, 
    updateGoal, 
    toggleGoalTask, 
    toggleHabitCompletion,
    addJournalEntry,
    deleteGoal,
  } = useAppState();

  const goal = state.goals.find(g => g.id === id);
  const isArchived = goal?.status === 'archived';
  const isCompleted = goal?.status === 'completed' || Boolean(goal?.completedAt);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(goal?.title || '');
  const [editedWhy, setEditedWhy] = useState(goal?.why || '');
  
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [confirmationType, setConfirmationType] = useState<'complete' | 'archive' | 'delete' | null>(null);
  const [isActionsMenuVisible, setIsActionsMenuVisible] = useState(false);

  const resolvedLifeArea = goal ? resolveGoalLifeArea(goal, state.aspirations) : undefined;
  const [selectedLifeArea, setSelectedLifeArea] = useState<LifeArea>(resolvedLifeArea ?? 'growth');
  const [isLifeAreaDropdownOpen, setIsLifeAreaDropdownOpen] = useState(false);

  useEffect(() => {
    setSelectedLifeArea(resolvedLifeArea ?? 'growth');
  }, [resolvedLifeArea]);

  type ConfirmationDetails = {
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
    tone: 'default' | 'success' | 'destructive' | 'warning';
    testIDPrefix: string;
    onConfirm: () => void;
  };

  const confirmationDetails = useMemo<ConfirmationDetails | null>(() => {
    if (!goal || !confirmationType) {
      return null;
    }

    switch (confirmationType) {
      case 'complete':
        return {
          title: 'Complete this goal?',
          description: 'Marking complete locks in your progress and celebrates this win.',
          confirmLabel: 'Complete Goal',
          cancelLabel: 'Not Yet',
          tone: 'success',
          testIDPrefix: 'goal-complete-confirmation',
          onConfirm: () => {
            updateGoal(
              goal.id,
              {
                status: 'completed',
                completedAt: new Date().toISOString(),
              },
              { toastMessage: 'Goal completed' }
            );
            setConfirmationType(null);
          },
        };
      case 'archive':
        return {
          title: 'Archive this goal?',
          description: 'We will keep everything safe while hiding it from your active plans.',
          confirmLabel: 'Archive Goal',
          cancelLabel: 'Keep Active',
          tone: 'warning',
          testIDPrefix: 'goal-archive-confirmation',
          onConfirm: () => {
            updateGoal(
              goal.id,
              { status: 'archived' },
              { toastMessage: 'Goal archived' }
            );
            setConfirmationType(null);
            router.back();
          },
        };
      case 'delete':
        return {
          title: 'Delete this goal?',
          description: 'This removes the goal, its tasks, and linked habits. This cannot be undone.',
          confirmLabel: 'Delete Goal',
          cancelLabel: 'Keep Goal',
          tone: 'destructive',
          testIDPrefix: 'goal-delete-confirmation',
          onConfirm: () => {
            deleteGoal(goal.id);
            setConfirmationType(null);
            router.back();
          },
        };
      default:
        return null;
    }
  }, [goal, confirmationType, updateGoal, deleteGoal, router]);

  // Stats calculation
  const stats = useMemo(() => {
    if (!goal) return { weeklyWins: 0, totalWins: 0 };

    const goalTasks = state.goalTasks.filter(t => t.goalId === goal.id);
    const habits = state.habits.filter(h => h.goalId === goal.id);

    const totalTaskWins = goalTasks.filter(t => t.completed).length;
    const totalHabitWins = habits.reduce((acc, h) => acc + h.completedDates.length, 0);
    
    // Weekly wins
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday as start

    const weeklyTaskWins = goalTasks.filter(t => {
      if (!t.completed || !t.completedAt) return false;
      return new Date(t.completedAt) >= startOfWeek;
    }).length;

    const weeklyHabitWins = habits.reduce((acc, h) => {
      const winsThisWeek = h.completedDates.filter(dateStr => new Date(dateStr) >= startOfWeek).length;
      return acc + winsThisWeek;
    }, 0);

    return {
      weeklyWins: weeklyTaskWins + weeklyHabitWins,
      totalWins: totalTaskWins + totalHabitWins,
    };
  }, [goal, state.goalTasks, state.habits]);

  const reflectionMutation = useMutation({
    mutationFn: async (text: string) => {
      const prompt = `User just reflected on their goal "${goal?.title}": "${text}".
      Provide a very short, compassionate, 1-sentence micro-prompt or insight to encourage them.
      Keep it under 20 words.`;
      
      const response = await generateText({ messages: [{ role: 'user', content: prompt }] });
      return response;
    },
    onSuccess: (data) => {
      setAiResponse(data);
      // Save journal entry
      const entry: JournalEntry = {
        id: Date.now().toString(),
        content: `#Goal: ${goal?.title}\n\n${reflectionText}\n\nAI Insight: ${data}`,
        createdAt: new Date().toISOString(),
        analyzed: false,
        tags: ['Goal'],
        linkedGoalId: goal?.id,
      };
      addJournalEntry(entry);
      setReflectionText('');
    },
  });

  const handleArchive = useCallback(() => {
    if (!goal || isArchived) {
      return;
    }
    setConfirmationType('archive');
  }, [goal, isArchived]);

  const handleCompleteGoal = useCallback(() => {
    if (!goal || isCompleted || isArchived) {
      return;
    }
    setConfirmationType('complete');
  }, [goal, isCompleted, isArchived]);

  const handleDeleteGoal = useCallback(() => {
    if (!goal) {
      return;
    }
    setConfirmationType('delete');
  }, [goal]);

  const menuActions = useMemo(
    () => [
      {
        key: 'complete' as const,
        label: isCompleted ? 'Completed' : 'Mark as Completed',
        description: isCompleted ? 'Already celebrated' : 'Lock in your progress',
        icon: CheckCircle2,
        disabled: isCompleted || isArchived,
        tone: 'success',
        handler: handleCompleteGoal,
        testID: 'more-menu-complete',
      },
      {
        key: 'archive' as const,
        label: isArchived ? 'Archived' : 'Archive Goal',
        description: isArchived ? 'Hidden from plans' : 'Tuck this away for later',
        icon: Archive,
        disabled: isArchived,
        tone: 'warning',
        handler: handleArchive,
        testID: 'more-menu-archive',
      },
      {
        key: 'delete' as const,
        label: 'Delete Goal',
        description: 'Remove goal and its actions',
        icon: Trash2,
        disabled: false,
        tone: 'destructive',
        handler: handleDeleteGoal,
        testID: 'more-menu-delete',
      },
    ],
    [handleArchive, handleCompleteGoal, handleDeleteGoal, isArchived, isCompleted]
  );

  const handleMenuSelection = useCallback((actionHandler: () => void, disabled?: boolean) => {
    if (disabled) {
      return;
    }
    setIsActionsMenuVisible(false);
    actionHandler();
  }, []);

  if (!goal) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Goal not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayLifeArea = isEditing ? selectedLifeArea : resolvedLifeArea ?? 'growth';
  const areaConfig = LIFE_AREA_CONFIG[displayLifeArea];
  const AreaIcon = areaConfig.icon;
  const lifeAreaLabel = getLifeAreaLabel(displayLifeArea) || areaConfig.label;
  const selectedAreaConfig = LIFE_AREA_CONFIG[selectedLifeArea];
  const SelectedAreaIcon = selectedAreaConfig.icon;

  const handleSaveEdit = () => {
    console.log('[GoalDetails] Saving goal edits with life area', selectedLifeArea);
    updateGoal(goal.id, {
      title: editedTitle,
      why: editedWhy,
      lifeArea: selectedLifeArea,
    }, { toastMessage: 'Goal saved' });
    setIsEditing(false);
    setIsLifeAreaDropdownOpen(false);
  };

  const activeTasks = state.goalTasks.filter(t => t.goalId === goal.id && !t.completed);
  const completedTasks = state.goalTasks.filter(t => t.goalId === goal.id && t.completed);
  const habits = state.habits.filter(h => h.goalId === goal.id);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setIsEditing(!isEditing)}
              style={styles.headerButton}
              testID="edit-goal-button"
            >
              <Pencil size={20} color={isEditing ? Colors.primary : Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsActionsMenuVisible(true)}
              style={styles.headerButton}
              testID="more-options-button"
            >
              <MoreVertical size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={[styles.lifeAreaTag, { backgroundColor: areaConfig.color + '20' }]}>
              <AreaIcon size={14} color={areaConfig.color} />
              <Text style={[styles.lifeAreaText, { color: areaConfig.color }]}>{lifeAreaLabel}</Text>
            </View>
            {isArchived && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>Archived</Text>
              </View>
            )}
            {isCompleted && !isArchived && (
              <View style={[styles.statusBadge, styles.completedBadge]}>
                <Text style={[styles.statusBadgeText, styles.completedBadgeText]}>Completed</Text>
              </View>
            )}
            
            {isEditing ? (
              <View style={styles.editContainer}>
                <Text style={styles.editLabel}>Goal Title</Text>
                <TextInput
                  style={styles.editInput}
                  value={editedTitle}
                  onChangeText={setEditedTitle}
                  multiline
                />
                 <Text style={styles.editLabel}>Why</Text>
                <TextInput
                  style={[styles.editInput, styles.textArea]}
                  value={editedWhy}
                  onChangeText={setEditedWhy}
                  multiline
                />
                <View style={styles.dropdownSection}>
                  <Text style={styles.editLabel}>Life Area</Text>
                  <TouchableOpacity
                    style={styles.dropdownControl}
                    onPress={() => setIsLifeAreaDropdownOpen(prev => !prev)}
                    activeOpacity={0.8}
                    testID="life-area-dropdown-toggle"
                  >
                    <View style={styles.dropdownValue}>
                      <View style={[styles.dropdownIconWrap, { backgroundColor: selectedAreaConfig.color + '20' }]}
                      >
                        <SelectedAreaIcon size={14} color={selectedAreaConfig.color} />
                      </View>
                      <Text style={styles.dropdownValueText}>{selectedAreaConfig.label}</Text>
                    </View>
                    <ChevronDown
                      size={18}
                      color={Colors.textSecondary}
                      style={{ transform: [{ rotate: isLifeAreaDropdownOpen ? '180deg' : '0deg' }] }}
                    />
                  </TouchableOpacity>
                  {isLifeAreaDropdownOpen && (
                    <View style={styles.dropdownList}>
                      {LIFE_AREA_OPTIONS.map(area => {
                        const optionConfig = LIFE_AREA_CONFIG[area];
                        const OptionIcon = optionConfig.icon;
                        const isActive = area === selectedLifeArea;
                        return (
                          <TouchableOpacity
                            key={area}
                            style={[styles.dropdownOption, isActive && styles.dropdownOptionActive]}
                            onPress={() => {
                              setSelectedLifeArea(area);
                              setIsLifeAreaDropdownOpen(false);
                              console.log('[GoalDetails] Selected life area', area);
                            }}
                            testID={`life-area-option-${area}`}
                          >
                            <View style={[styles.dropdownOptionIcon, { backgroundColor: optionConfig.color + '20' }]}
                            >
                              <OptionIcon size={14} color={optionConfig.color} />
                            </View>
                            <Text style={[styles.dropdownOptionText, isActive && styles.dropdownOptionTextActive]}>
                              {optionConfig.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.goalTitle}>{goal.title}</Text>
                {goal.why && <Text style={styles.goalWhy}>{goal.why}</Text>}
              </>
            )}
          </View>

          {/* Stats Section */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.weeklyWins}</Text>
              <Text style={styles.statLabel}>Wins this week</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalWins}</Text>
              <Text style={styles.statLabel}>Total wins</Text>
            </View>
          </View>

          {/* Habits Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Habits</Text>
            {habits.length === 0 ? (
              <Text style={styles.emptyText}>No habits yet.</Text>
            ) : (
              habits.map(habit => {
                const today = new Date().toISOString().split('T')[0];
                const isDoneToday = habit.completedDates.includes(today);
                return (
                  <View key={habit.id} style={styles.actionCard}>
                    <TouchableOpacity 
                      style={styles.actionIcon}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync();
                        toggleHabitCompletion(habit.id, new Date().toISOString());
                      }}
                    >
                      <RefreshCw size={20} color={isDoneToday ? Colors.primary : Colors.textSecondary} />
                    </TouchableOpacity>
                    <View style={styles.actionContent}>
                      <Text style={styles.actionTitle}>{habit.title}</Text>
                      <Text style={styles.actionSubtext}>
                         {habit.frequency === 'weekly' && habit.weekDays ? 
                          `Weekly on ${habit.weekDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}` : 
                          'Daily'
                        }
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.actionEdit}>
                      {/* Placeholder for editing habit */}
                      <Pencil size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>

          {/* Tasks Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tasks</Text>
            {activeTasks.length === 0 ? (
               <Text style={styles.emptyText}>No active tasks.</Text>
            ) : (
              activeTasks.map(task => (
                <View key={task.id} style={styles.actionCard}>
                  <TouchableOpacity 
                    style={styles.actionIcon}
                    onPress={() => {
                       if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                       toggleGoalTask(task.id);
                    }}
                  >
                    <Circle size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>{task.title}</Text>
                  </View>
                   <TouchableOpacity style={styles.actionEdit}>
                     <Pencil size={16} color={Colors.textSecondary} />
                   </TouchableOpacity>
                </View>
              ))
            )}
             {/* Add Task Button placeholder */}
             {/* <TouchableOpacity style={styles.addButton}>
               <Plus size={16} color={Colors.primary} />
               <Text style={styles.addButtonText}>Add Task</Text>
             </TouchableOpacity> */}
          </View>

          {/* Completed Section */}
          {(completedTasks.length > 0) && (
            <View style={styles.section}>
              <TouchableOpacity 
                style={styles.accordionHeader} 
                onPress={() => setIsCompletedExpanded(!isCompletedExpanded)}
              >
                <Text style={styles.sectionTitle}>Completed</Text>
                {isCompletedExpanded ? <ChevronDown size={20} color={Colors.textSecondary} /> : <ChevronRight size={20} color={Colors.textSecondary} />}
              </TouchableOpacity>
              
              {isCompletedExpanded && (
                <View style={styles.completedList}>
                  {completedTasks.map(task => (
                    <View key={task.id} style={[styles.actionCard, styles.completedCard]}>
                      <TouchableOpacity 
                        style={styles.actionIcon}
                         onPress={() => toggleGoalTask(task.id)}
                      >
                        <CheckCircle2 size={20} color={Colors.textSecondary} />
                      </TouchableOpacity>
                      <View style={styles.actionContent}>
                        <Text style={[styles.actionTitle, styles.completedText]}>{task.title}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Reflection Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reflection</Text>
            <View style={styles.reflectionCard}>
              <TextInput
                style={styles.reflectionInput}
                placeholder="What's one thing you noticed about your progress?"
                placeholderTextColor={Colors.textSecondary}
                multiline
                value={reflectionText}
                onChangeText={setReflectionText}
              />
              <TouchableOpacity 
                style={[styles.submitButton, !reflectionText.trim() && styles.buttonDisabled]}
                onPress={() => reflectionMutation.mutate(reflectionText)}
                disabled={!reflectionText.trim() || reflectionMutation.isPending}
              >
                 {reflectionMutation.isPending ? (
                   <ActivityIndicator color={Colors.surface} size="small" />
                 ) : (
                    <>
                      <Sparkles size={16} color={Colors.surface} />
                      <Text style={styles.submitButtonText}>Reflect</Text>
                    </>
                 )}
              </TouchableOpacity>
            </View>

            {aiResponse && (
              <View style={styles.aiResponseCard}>
                <Sparkles size={16} color={Colors.primary} style={styles.aiIcon} />
                <Text style={styles.aiResponseText}>{aiResponse}</Text>
              </View>
            )}
          </View>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {isActionsMenuVisible ? (
        <Modal
          transparent
          animationType="fade"
          visible={isActionsMenuVisible}
          onRequestClose={() => setIsActionsMenuVisible(false)}
        >
          <View style={styles.menuOverlay}>
            <Pressable style={styles.menuBackdrop} onPress={() => setIsActionsMenuVisible(false)} />
            <View style={[styles.menuCard, { paddingBottom: insets.bottom + 12 }]}>
              <Text style={styles.menuTitle}>Goal actions</Text>
              {menuActions.map(action => {
                const IconComponent = action.icon;
                return (
                  <TouchableOpacity
                    key={action.key}
                    style={[styles.menuItem, action.disabled && styles.menuItemDisabled]}
                    onPress={() => handleMenuSelection(action.handler, action.disabled)}
                    disabled={action.disabled}
                    testID={action.testID}
                  >
                    <View style={[styles.menuIconWrap, action.tone === 'destructive' && styles.menuIconDestructive]}>
                      <IconComponent
                        size={18}
                        color={
                          action.tone === 'destructive'
                            ? Colors.error
                            : action.tone === 'warning'
                              ? Colors.warning
                              : Colors.primary
                        }
                      />
                    </View>
                    <View style={styles.menuTextWrap}>
                      <Text style={styles.menuItemLabel}>{action.label}</Text>
                      {action.description ? (
                        <Text style={styles.menuItemDescription}>{action.description}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Modal>
      ) : null}

      {confirmationDetails ? (
        <ConfirmationModal
          visible
          title={confirmationDetails.title}
          description={confirmationDetails.description}
          confirmLabel={confirmationDetails.confirmLabel}
          cancelLabel={confirmationDetails.cancelLabel}
          tone={confirmationDetails.tone}
          onConfirm={confirmationDetails.onConfirm}
          onCancel={() => setConfirmationType(null)}
          testIDPrefix={confirmationDetails.testIDPrefix}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonDisabled: {
    opacity: 0.4,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  lifeAreaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  lifeAreaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 16,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.4,
  },
  completedBadge: {
    backgroundColor: Colors.primary + '20',
  },
  completedBadgeText: {
    color: Colors.primary,
  },
  goalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 34,
  },
  goalWhy: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  actionCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIcon: {
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  actionSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionEdit: {
    padding: 8,
  },
  completedCard: {
    opacity: 0.6,
    backgroundColor: 'transparent',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completedList: {
    marginTop: 4,
  },
  reflectionCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reflectionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
    color: Colors.text,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: Colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  aiResponseCard: {
    marginTop: 16,
    backgroundColor: Colors.primary + '15',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  aiIcon: {
    marginTop: 2,
  },
  aiResponseText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  editContainer: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  editInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownSection: {
    marginBottom: 16,
  },
  dropdownControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  dropdownValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownValueText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  dropdownIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  dropdownOptionActive: {
    backgroundColor: Colors.primary + '12',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  dropdownOptionTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  dropdownOptionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.text,
    fontSize: 18,
    marginBottom: 16,
  },
  backButton: {
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  backButtonText: {
    color: Colors.text,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemDisabled: {
    opacity: 0.4,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconDestructive: {
    backgroundColor: Colors.error + '15',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  menuItemDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
