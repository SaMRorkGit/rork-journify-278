import { Stack, useRouter } from 'expo-router';
import React, { useState, useRef, useMemo } from 'react';
import type { ComponentType } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../../contexts/AppStateContext';
import Colors from '../../constants/colors';
import { getLifeAreaLabel, resolveGoalLifeArea, resolveHabitLifeArea } from '../../constants/life-area-helpers';
import type { Todo, LifeArea, Habit, Goal, GoalTask } from '../../types';

const LIFE_AREA_ICON_CONFIG: Record<LifeArea, { Icon: ComponentType<{ size?: number; color?: string }>; color: string }> = {
relationship: { Icon: (props) => <Ionicons name="heart" {...props} />, color: '#FF6B9D' },
career:       { Icon: (props) => <Ionicons name="briefcase" {...props} />, color: '#4A90E2' },
health:       { Icon: (props) => <Ionicons name="pulse" {...props} />, color: '#47c447' },
finance:      { Icon: (props) => <Ionicons name="wallet" {...props} />, color: '#F5A623' },
growth:       { Icon: (props) => <Ionicons name="leaf" {...props} />, color: '#AF9BFF' },

};

function LifeAreaIcon({ lifeArea }: { lifeArea?: LifeArea }) {
  if (!lifeArea) return null;
  const config = LIFE_AREA_ICON_CONFIG[lifeArea] ?? LIFE_AREA_ICON_CONFIG.growth;
  const { Icon, color } = config;

  return (
    <View style={[styles.lifeAreaIcon, { backgroundColor: `${color}20` }]}>
      <Icon size={16} color={color} />
    </View>
  );
}



type ActionMenuType = 'goal' | 'habit' | 'todo' | null;

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [actionMenuOpen, setActionMenuOpen] = useState<ActionMenuType>(null);
  const todoInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleAddAction = (type: 'goal' | 'habit' | 'todo') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (type === 'goal') {
      router.push('/goal-setup' as any);
    } else if (type === 'habit') {
      router.push('/habit-setup' as any);
    } else if (type === 'todo') {
      scrollViewRef.current?.scrollToEnd({ animated: true });
      setTimeout(() => {
        todoInputRef.current?.focus();
      }, 300);
    }
    setActionMenuOpen(null);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Plan</Text>
          <Text style={styles.headerSubtitle}>Organize your goals and actions</Text>
        </View>

        <UnifiedPlanView scrollViewRef={scrollViewRef} todoInputRef={todoInputRef} />
        
        <TouchableOpacity
          style={[styles.floatingButton, { bottom: insets.bottom + 20 }]}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            setActionMenuOpen(actionMenuOpen ? null : 'goal');
          }}
        >
          <Ionicons name="add" size={28} color={Colors.surface} />
        </TouchableOpacity>

        {actionMenuOpen && (
          <View style={styles.actionMenuOverlay}>
            <TouchableOpacity 
              style={styles.actionMenuOverlay}
              activeOpacity={1}
              onPress={() => setActionMenuOpen(null)}
            >
              <View style={[styles.actionMenu, { bottom: insets.bottom + 90 }]}>
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={() => handleAddAction('goal')}
                >
                  <View style={styles.actionMenuIconContainer}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.actionMenuItemText}>Add Goal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={() => handleAddAction('habit')}
                >
                  <View style={styles.actionMenuIconContainer}>
                    <Ionicons name="refresh" size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.actionMenuItemText}>Add Habit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={() => handleAddAction('todo')}
                >
                  <View style={styles.actionMenuIconContainer}>
                    <Ionicons name="ellipse-outline" size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.actionMenuItemText}>Add To-do</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}

function UnifiedPlanView({ scrollViewRef, todoInputRef }: { scrollViewRef: React.RefObject<ScrollView | null>, todoInputRef: React.RefObject<TextInput | null> }) {
  const { state, addTodo, toggleTodo } = useAppState();
  const [newTodoTitle, setNewTodoTitle] = useState('');

  const activeGoals = useMemo(() => {
    const goals = state.goals.filter(g => !g.completedAt);
    return [...goals].sort((a, b) => {
      if (a.isFocusGoal && !b.isFocusGoal) return -1;
      if (!a.isFocusGoal && b.isFocusGoal) return 1;
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return aTime - bTime;
    });
  }, [state.goals]);
  const standaloneHabits = state.habits.filter(h => !h.goalId);
  const activeTodos = state.todos.filter(t => !t.completed);

  const handleAddTodo = () => {
    if (newTodoTitle.trim()) {
      const todo: Todo = {
        id: Date.now().toString(),
        title: newTodoTitle.trim(),
        completed: false,
        group: 'now',
        createdAt: new Date().toISOString(),
      };
      addTodo(todo);
      setNewTodoTitle('');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.tabContent} 
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GOALS</Text>
        {activeGoals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No active goals</Text>
            <Text style={styles.emptyStateSubtext}>Set meaningful goals to guide your journey</Text>
          </View>
        ) : (
          activeGoals.map((goal) => (
            <GoalItemCard key={goal.id} goal={goal} />
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>STANDALONE HABITS</Text>
        {standaloneHabits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No standalone habits</Text>
            <Text style={styles.emptyStateSubtext}>Build consistency through daily practice</Text>
          </View>
        ) : (
          standaloneHabits.map((habit) => (
            <HabitItemCard key={habit.id} habit={habit} />
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TO-DOS</Text>
        {activeTodos.map((todo) => (
          <TodoItemCard
            key={todo.id}
            todo={todo}
            onToggle={() => toggleTodo(todo.id)}
          />
        ))}
        
        <View style={styles.addTodoInline}>
          <TextInput
            ref={todoInputRef}
            style={styles.addTodoInlineInput}
            placeholder="Add a new to-do..."
            placeholderTextColor={Colors.textSecondary}
            value={newTodoTitle}
            onChangeText={setNewTodoTitle}
            onSubmitEditing={handleAddTodo}
          />
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function TodoItemCard({
  todo,
  onToggle,
}: {
  todo: Todo;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.planItem}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      {todo.completed ? (
        <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
      ) : (
        <Ionicons name="ellipse-outline" size={24} color={Colors.textSecondary} />
      )}
      <View style={styles.planItemContent}>
        <Text style={[styles.planItemTitle, todo.completed && styles.planItemTitleCompleted]}>
          {todo.title}
        </Text>
        {todo.description && (
          <Text style={styles.planItemDescription}>{todo.description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function HabitItemCard({ habit }: { habit: Habit }) {
  const router = useRouter();
  const { state } = useAppState();
  const lifeArea = resolveHabitLifeArea(habit, { aspirations: state.aspirations, goals: state.goals });
  
  return (
    <TouchableOpacity 
      style={styles.planItem}
      onPress={() => router.push({ pathname: '/habit-edit' as any, params: { id: habit.id } })}
      activeOpacity={0.7}
    >
      <Ionicons name="refresh" size={24} color={Colors.accent} />
      <View style={styles.planItemContent}>
        <View style={styles.habitTitleRow}>
          <Text style={styles.planItemTitle}>{habit.title}</Text>
          <LifeAreaIcon lifeArea={lifeArea} />
        </View>
        <Text style={styles.planItemMeta}>
          {getHabitFrequencyText(habit)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function getHabitFrequencyText(habit: Habit) {
  if (habit.frequency === 'daily') return 'Daily';
  if (habit.frequency === 'weekly') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (!habit.weekDays || habit.weekDays.length === 0) return 'Weekly';
    return `Weekly on ${habit.weekDays.map((d: number) => days[d]).join(', ')}`;
  }
  return '';
}

function GoalItemCard({ goal }: { goal: Goal }) {
  const router = useRouter();
  const { state, setFocusGoal } = useAppState();
  const [isExpanded, setIsExpanded] = useState(false);
  const isFocusGoal = goal.isFocusGoal === true;
  
  const lifeArea = resolveGoalLifeArea(goal, state.aspirations);
  const lifeAreaLabel = getLifeAreaLabel(lifeArea);
  const goalTasks = useMemo(() => {
    const ids = goal.goalTaskIds ?? [];
    const ordered = ids
      .map(taskId => state.goalTasks.find(t => t.id === taskId))
      .filter((task): task is GoalTask => Boolean(task));
    const extras = state.goalTasks
      .filter(task => task.goalId === goal.id && !ids.includes(task.id))
      .sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return aTime - bTime;
      });
    return [...ordered, ...extras];
  }, [goal.goalTaskIds, goal.id, state.goalTasks]);
  const habits = state.habits.filter(h => {
    if (goal.habitIds?.includes(h.id)) return true;
    if (h.goalId === goal.id) return true;
    return false;
  });
  
  const calculateProgress = () => {
    const goalTaskIds = goal.goalTaskIds || [];
    if (goalTaskIds.length === 0) return 0;
    const completedTasks = goalTasks.filter(t => t.completed).length;
    return (completedTasks / goalTaskIds.length) * 100;
  };
  
  const progress = calculateProgress();
  const taskScheduleMeta = useMemo(() => buildGoalTaskSchedule(goalTasks), [goalTasks]);
  
  return (
    <View style={[styles.goalCard, isFocusGoal && styles.focusGoalCard]}>
      <TouchableOpacity 
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.goalCardHeader}>
          <View style={styles.goalTitleContainer}>
            <View style={styles.goalTitleRow}>
              <LifeAreaIcon lifeArea={lifeArea} />
              <Text style={styles.goalTitle}>{goal.title}</Text>
            </View>
            {goal.why ? (
              <Text style={styles.goalWhy} numberOfLines={2}>
                {goal.why}
              </Text>
            ) : null}
          </View>
          <View style={styles.goalCardHeaderRight}>
            {isFocusGoal && (
              <View style={styles.focusBadge}>
                <Text style={styles.focusBadgeText}>Focus goal</Text>
              </View>
            )}
            {lifeAreaLabel && (
              <View style={styles.aspirationBadge}>
                <Text style={styles.aspirationBadgeText}>{lifeAreaLabel}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setFocusGoal(isFocusGoal ? undefined : goal.id)}
              style={styles.focusStarButton}
              activeOpacity={0.8}
              testID={`goal-${goal.id}-focus-toggle`}
            >
              <Ionicons
  name="star"
  size={18}
  color={isFocusGoal ? '#F5C34A' : Colors.textSecondary}
/>

            </TouchableOpacity>
            <Ionicons
  name="chevron-down"
  size={20}
  color={Colors.textSecondary}
  style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
/>

          </View>
        </View>
        
        {goal.targetDate && (
          <>
            <Text style={styles.goalDate}>
              Target: {goal.targetDate}
            </Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}% complete</Text>
          </>
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandedContent}>
          {goalTasks.length > 0 && (
            <View style={styles.expandedSection}>
              <Text style={styles.expandedSectionTitle}>Tasks</Text>
              {goalTasks.map(task => (
                <View key={task.id} style={styles.taskItem}>
                  <Ionicons
  name="checkmark-circle"
  size={16}
  color={task.completed ? Colors.primary : Colors.textSecondary}
/>
                  <View style={styles.taskItemDetails}>
                    <Text style={[styles.taskItemText, task.completed && styles.taskItemTextCompleted]}>
                      {task.title}
                    </Text>
                    {taskScheduleMeta[task.id] ? (
                      <Text
                        style={[
                          styles.taskScheduleLabel,
                          task.completed && styles.taskScheduleLabelCompleted,
                        ]}
                      >
                        {taskScheduleMeta[task.id]}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          {habits.length > 0 && (
            <View style={styles.expandedSection}>
              <Text style={styles.expandedSectionTitle}>Habits</Text>
              {habits.map(habit => (
                <TouchableOpacity 
                  key={habit.id} 
                  style={[styles.taskItem, { alignItems: 'flex-start' }]}
                  onPress={() => router.push({ pathname: '/habit-edit' as any, params: { id: habit.id } })}
                >
                  <Ionicons name="refresh" size={16} color={Colors.accent} />

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.taskItemText, { flex: 0 }]}>{habit.title}</Text>
                    <Text style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 2 }}>
                      {getHabitFrequencyText(habit)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {isExpanded && (
        <>
          <TouchableOpacity
            style={styles.addActionButton}
            onPress={() => router.push({ pathname: '/goal-actions' as any, params: { id: goal.id } })}
            activeOpacity={0.85}
            testID={`goal-${goal.id}-add-action`}
          >
            <Ionicons name="add" size={18} color={Colors.surface} />

            <Text style={styles.addActionButtonText}>Add Action</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => router.push({ pathname: '/goal-details' as any, params: { id: goal.id } })}
            activeOpacity={0.85}
            testID={`goal-${goal.id}-view-details`}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.text} />

          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const buildGoalTaskSchedule = (tasks: GoalTask[]): Record<string, string> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let offset = 0;
  const schedule: Record<string, string> = {};

  tasks.forEach(task => {
    if (task.completed) {
      schedule[task.id] = task.completedAt ? `Completed ${formatShortDate(task.completedAt)}` : 'Completed';
      return;
    }
    const target = new Date(today);
    target.setDate(today.getDate() + offset);
    schedule[task.id] = getRelativeLabel(target, today);
    offset += 1;
  });

  return schedule;
};

const getRelativeLabel = (target: Date, base: Date) => {
  const diff = Math.round((target.getTime() - base.getTime()) / DAY_IN_MS);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatShortDate = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDeep,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: 0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSub,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  addTodoInline: {
    marginTop: 12,
  },
  addTodoInlineInput: {
    backgroundColor: 'rgba(4, 22, 30, 0.9)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 13,
    color: Colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  section: {
    marginBottom: 28,
  },
  planItem: {
    backgroundColor: Colors.glassBg,
    borderRadius: 22,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  planItemContent: {
    flex: 1,
  },
  planItemTitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  planItemTitleCompleted: {
    textDecorationLine: 'line-through' as const,
    color: Colors.textSecondary,
  },
  planItemDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  planItemMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  floatingButton: {
    position: 'absolute' as const,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.tealMain,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionMenuOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  actionMenu: {
    position: 'absolute' as const,
    right: 20,
    backgroundColor: Colors.glassBg,
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  actionMenuItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
    gap: 12,
  },
  actionMenuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(50, 208, 193, 0.15)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  actionMenuItemText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },

  emptyState: {
    backgroundColor: Colors.glassBg,
    borderRadius: 22,
    padding: 32,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  habitCard: {
    backgroundColor: Colors.glassBg,
    borderRadius: 22,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  habitCardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  habitMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  goalCard: {
    backgroundColor: Colors.glassBg,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  focusGoalCard: {
    borderColor: '#F5C34A',
    shadowColor: '#F5C34A',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  goalCardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  goalTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    flex: 1,
  },
  goalTitleContainer: {
    flex: 1,
    gap: 6,
  },
  goalWhy: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 0,
  },
  goalDate: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '500' as const,
  },
  aspirationBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aspirationBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  bottomSpacer: {
    height: 40,
  },
  goalCardHeaderRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  focusBadge: {
    backgroundColor: '#F5C34A20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  focusBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#A6741A',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden' as const,
  },
  focusStarButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(245, 195, 74, 0.4)',
    backgroundColor: '#F5C34A10',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  expandedSection: {
    marginBottom: 16,
  },
  expandedSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
  },
  taskItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 8,
  },
  taskItemDetails: {
    flex: 1,
  },
  taskItemText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  taskItemTextCompleted: {
    textDecorationLine: 'line-through' as const,
    color: Colors.textSecondary,
  },
  taskScheduleLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  taskScheduleLabelCompleted: {
    color: Colors.textSecondary,
    opacity: 0.8,
  },
  goalActions: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 8,
  },
  goalActionButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: 'rgba(50, 208, 193, 0.15)',
    borderRadius: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.tealSoft,
  },
  deleteButton: {
    backgroundColor: '#ff000010',
    borderColor: Colors.error,
  },
  goalActionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  deleteButtonText: {
    color: Colors.error,
  },
  drawerOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end' as const,
  },
  drawerContent: {
    backgroundColor: Colors.glassBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 200,
  },
  drawerContentScrollable: {
    backgroundColor: Colors.glassBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  drawerText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  drawerSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  drawerActions: {
    gap: 12,
  },
  drawerButton: {
    backgroundColor: Colors.tealMain,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  deleteButtonFull: {
    backgroundColor: '#ff000010',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  drawerButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  deleteButtonTextFull: {
    color: Colors.error,
  },
  habitTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    flex: 1,
  },
  lifeAreaIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  editSection: {
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
  },
  editInput: {
    backgroundColor: 'rgba(4, 22, 30, 0.9)',
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: Colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  editTextArea: {
    minHeight: 80,
  },
  frequencyButtons: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(4, 22, 30, 0.9)',
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  frequencyButtonActive: {
    backgroundColor: Colors.tealMain,
    borderColor: Colors.tealSoft,
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  frequencyButtonTextActive: {
    color: Colors.surface,
  },
  aspirationScroll: {
    flexGrow: 0,
  },
  aspirationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(4, 22, 30, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    marginRight: 8,
  },
  aspirationChipActive: {
    backgroundColor: Colors.tealMain,
    borderColor: Colors.tealSoft,
  },
  aspirationChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  aspirationChipTextActive: {
    color: Colors.surface,
  },
  viewDetailsButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: 0.2,
  },
  addActionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: Colors.tealMain,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.tealSoft,
  },
  addActionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.surface,
    letterSpacing: 0.3,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  stubHabitText: {
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
  },
  stubHabitNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
    marginTop: 4,
  },
});
