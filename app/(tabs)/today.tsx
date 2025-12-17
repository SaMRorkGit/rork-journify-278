import { Stack, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Award, ChevronDown, ChevronRight, Moon, Plus, Sun } from 'lucide-react-native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, PanResponder, Animated, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { generateText } from '@rork-ai/toolkit-sdk';
import { useAppState, useTodayTodos, useTodayHabits, useTodayGoalTasks } from '../../contexts/AppStateContext';
import type { Todo, MoodType, DailyCheckIn, CheckInType, AppState } from '../../types';
import Colors from '../../constants/colors';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const appState = useAppState();
  
  const { state, toggleTodo, toggleHabitCompletion, toggleGoalTask, addTodo, calculateXPForLevel, addDailyCheckIn, updateDailyCheckIn } = appState;
  const router = useRouter();
  const todos = useTodayTodos();
  const habits = useTodayHabits();
  const goalTasks = useTodayGoalTasks();
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [activeCheckInTab, setActiveCheckInTab] = useState<'morning' | 'evening'>(() => {
    const hour = new Date().getHours();
    return hour >= 0 && hour < 17 ? 'morning' : 'evening';
  });
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [checkInReflection, setCheckInReflection] = useState('');
  const [isEditingCheckIn, setIsEditingCheckIn] = useState(false);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

  const handleAddTodo = () => {
    if (!addTodo) return;
    
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

  const handleTodoToggle = (id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleTodo(id);
  };

  const handleHabitToggle = (id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    toggleHabitCompletion(id, new Date().toISOString());
  };

  const handleTaskEdit = (id: string, isGoalTask: boolean) => {
    const type = isGoalTask ? 'goal' : 'todo';
    router.push({
      pathname: '/task-edit',
      params: { id, type },
    });
  };

  const handleEditHabit = (habitId: string) => {
    router.push(`/habit-edit?id=${habitId}`);
  };

  const getTodayCheckIns = () => {
    const today = new Date().toISOString().split('T')[0] || '';
    const morningCheckIn = state.dailyCheckIns.find(c => c.date === today && c.type === 'morning');
    const eveningCheckIn = state.dailyCheckIns.find(c => c.date === today && c.type === 'evening');
    return { morningCheckIn, eveningCheckIn, today };
  };

  const getCheckInConfig = (type: CheckInType) => {
    if (type === 'morning') {
      return {
        title: 'Morning Intention',
        subtext: 'How are you today?',
        placeholder: "What's on your mind now?",
        buttonMessage: "Thanks for checking in. Let's take today one gentle step at a time.",
      };
    } else {
      return {
        title: 'Evening Reflection',
        subtext: 'How was your day?',
        placeholder: 'What felt good about today?',
        buttonMessage: 'Nice work checking in this evening. A moment of reflection is a gift to your future self.',
      };
    }
  };

  const getMoodEvaluation = () => {
    const { morningCheckIn, eveningCheckIn } = getTodayCheckIns();
    if (!morningCheckIn || !eveningCheckIn) return null;

    const moodOrder: MoodType[] = ['great', 'fine', 'neutral', 'stressed', 'low'];
    const morningIndex = moodOrder.indexOf(morningCheckIn.mood);
    const eveningIndex = moodOrder.indexOf(eveningCheckIn.mood);

    if (eveningIndex < morningIndex) {
      return "You moved one step closer to the person you're becoming. Beautiful work.";
    } else if (eveningIndex > morningIndex) {
      return "It\u2019s amazing that you still showed up \u2014 tomorrow is a fresh page.";
    }
    return null;
  };

  const handleCheckIn = () => {
    if (!selectedMood) return;

    const checkInType = activeCheckInTab;
    const { today } = getTodayCheckIns();
    
    const { morningCheckIn, eveningCheckIn } = getTodayCheckIns();
    const currentCheckIn = checkInType === 'morning' ? morningCheckIn : eveningCheckIn;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    if (currentCheckIn) {
      updateDailyCheckIn(currentCheckIn.id, {
        mood: selectedMood,
        reflection: checkInReflection,
      });
    } else {
      const newCheckIn: DailyCheckIn = {
        id: Date.now().toString(),
        date: today,
        type: checkInType,
        mood: selectedMood,
        reflection: checkInReflection,
        createdAt: new Date().toISOString(),
      };
      addDailyCheckIn(newCheckIn);
    }

    setIsEditingCheckIn(false);
  };

  const handleEditCheckIn = () => {
    const { morningCheckIn, eveningCheckIn } = getTodayCheckIns();
    const currentCheckIn = activeCheckInTab === 'morning' ? morningCheckIn : eveningCheckIn;
    
    if (currentCheckIn) {
      setSelectedMood(currentCheckIn.mood);
      setCheckInReflection(currentCheckIn.reflection || '');
      setIsEditingCheckIn(true);
    }
  };

  const getSummaryText = (text: string) => {
    if (!text || text.trim().length === 0) return '';
    const words = text.trim().split(' ');
    if (words.length <= 10) return text;
    return words.slice(0, 10).join(' ') + '...';
  };

  const getMoodEmoji = (mood: MoodType) => {
    const moodMap = {
      great: '😃',
      fine: '😊',
      neutral: '😐',
      stressed: '😖',
      low: '😢',
    };
    return moodMap[mood];
  };

  const getSortedActions = (
    habits: ReturnType<typeof useTodayHabits>,
    todos: Todo[],
    goalTasks: any[],
    state: any
  ) => {
    const items: {
      id: string;
      type: 'habit' | 'task';
      data: any;
      completed: boolean;
      order: number;
      goalId?: string;
    }[] = [];

    habits.forEach((habit) => {
      items.push({
        id: habit.id,
        type: 'habit',
        data: habit,
        completed: habit.completedToday,
        order: habit.completedToday ? 2 : 0,
        goalId: habit.goalId,
      });
    });

    goalTasks.forEach((goalTask) => {
      items.push({
        id: goalTask.id,
        type: 'task',
        data: goalTask,
        completed: goalTask.completed,
        order: goalTask.completed ? 2 : 1,
        goalId: goalTask.goalId,
      });
    });

    todos.forEach((todo) => {
      items.push({
        id: todo.id,
        type: 'task',
        data: todo,
        completed: todo.completed,
        order: todo.completed ? 2 : 1,
        goalId: undefined,
      });
    });

    return items.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      if (a.type === 'task' && b.type === 'task') {
        const aTime = getTaskChronologyValue(a.data);
        const bTime = getTaskChronologyValue(b.data);
        if (aTime !== bTime) {
          return aTime - bTime;
        }
        const aGoal = a.goalId ? state.goals.find((g: any) => g.id === a.goalId) : undefined;
        const bGoal = b.goalId ? state.goals.find((g: any) => g.id === b.goalId) : undefined;
        const aIndex = aGoal?.goalTaskIds?.indexOf(a.id) ?? -1;
        const bIndex = bGoal?.goalTaskIds?.indexOf(b.id) ?? -1;
        if (aIndex !== -1 && bIndex !== -1 && aIndex !== bIndex) {
          return aIndex - bIndex;
        }
      }
      return 0;
    });
  };

  const isEverythingCompletedToday = () => {
    const allTodosComplete = todos.every(t => t.completed);
    const allGoalTasksComplete = goalTasks.every(t => t.completed);
    const allHabitsComplete = habits.every(h => h.completedToday);
    
    return allTodosComplete && allGoalTasksComplete && allHabitsComplete && 
           (todos.length > 0 || goalTasks.length > 0 || habits.length > 0);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 12 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Today</Text>
              <Text style={styles.headerSubtitle}>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>
            <View style={styles.levelBadgeContainer}>
              <View style={styles.levelBadgeRight}>
                <Award size={16} color={Colors.primary} />
                <Text style={styles.levelTextRight}>Lv {state.userProgress?.level ?? 1}</Text>
              </View>
              <View style={styles.levelProgressBar}>
                <View style={[styles.levelProgressFill, { 
                  width: `${((state.userProgress?.xp ?? 0) / calculateXPForLevel(state.userProgress?.level ?? 1)) * 100}%` 
                }]} />
              </View>
              <Text style={styles.xpText}>
                {state.userProgress?.xp ?? 0}/{calculateXPForLevel(state.userProgress?.level ?? 1)}
              </Text>
            </View>
          </View>
        </View>

        <WeekPreview isCompletedToday={isEverythingCompletedToday()} />

        <VisionEssenceCard state={state} />

        <Text style={styles.checkInTitleOutside}>DAILY CHECK-IN</Text>
        <View style={styles.journalSection}>
          <View style={styles.checkInTabs}>
            <TouchableOpacity 
              style={[styles.checkInTab, activeCheckInTab === 'morning' && styles.checkInTabActive]}
              onPress={() => {
                setActiveCheckInTab('morning');
                setCheckInReflection('');
                setSelectedMood(null);
                setIsEditingCheckIn(false);
                if (Platform.OS !== 'web') Haptics.selectionAsync();
              }}
            >
              <Sun size={16} color={activeCheckInTab === 'morning' ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.checkInTabText, activeCheckInTab === 'morning' && styles.checkInTabTextActive]}>Morning Intention</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.checkInTab, activeCheckInTab === 'evening' && styles.checkInTabActive]}
              onPress={() => {
                setActiveCheckInTab('evening');
                setCheckInReflection('');
                setSelectedMood(null);
                setIsEditingCheckIn(false);
                if (Platform.OS !== 'web') Haptics.selectionAsync();
              }}
            >
              <Moon size={16} color={activeCheckInTab === 'evening' ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.checkInTabText, activeCheckInTab === 'evening' && styles.checkInTabTextActive]}>Evening Reflection</Text>
            </TouchableOpacity>
          </View>

          {(() => {
            const config = getCheckInConfig(activeCheckInTab);
            const { morningCheckIn, eveningCheckIn } = getTodayCheckIns();
            const currentCheckIn = activeCheckInTab === 'morning' ? morningCheckIn : eveningCheckIn;
            const showCheckInForm = !currentCheckIn || isEditingCheckIn;
            const evaluation = getMoodEvaluation();

            return (
              <>
                <Text style={styles.checkInSubtext}>{config.subtext}</Text>

                {showCheckInForm ? (
                  <>
                    <View style={styles.moodSelector}>
                      {[
                        { emoji: '😃', mood: 'great' as MoodType, label: 'Great' },
                        { emoji: '😊', mood: 'fine' as MoodType, label: 'Fine' },
                        { emoji: '😐', mood: 'neutral' as MoodType, label: 'Neutral' },
                        { emoji: '😖', mood: 'stressed' as MoodType, label: 'Stressed' },
                        { emoji: '😢', mood: 'low' as MoodType, label: 'Sad' },
                      ].map(({ emoji, mood, label }) => (
                        <TouchableOpacity
                          key={mood}
                          style={[styles.moodButton, selectedMood === mood && styles.moodButtonSelected]}
                          onPress={() => {
                            if (Platform.OS !== 'web') {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                            setSelectedMood(mood);
                          }}
                        >
                          <Text style={styles.moodEmoji}>{emoji}</Text>
                          {selectedMood === mood && (
                            <Text style={styles.moodLabel}>{label}</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      style={styles.journalInput}
                      placeholder={config.placeholder}
                      placeholderTextColor={Colors.textSecondary}
                      multiline
                      numberOfLines={2}
                      value={checkInReflection}
                      onChangeText={setCheckInReflection}
                      textAlignVertical="top"
                    />
                    <TouchableOpacity
                      style={[styles.reflectButton, !selectedMood && styles.reflectButtonDisabled]}
                      onPress={handleCheckIn}
                      disabled={!selectedMood}
                    >
                      <Text style={styles.reflectButtonText}>Check in</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.checkInSummaryCard}>
                      <View style={styles.checkInSummaryContent}>
                        <Text style={styles.checkInEmoji}>{getMoodEmoji(currentCheckIn.mood)}</Text>
                        {currentCheckIn.reflection && (
                          <Text style={styles.checkInSummaryText}>
                            {getSummaryText(currentCheckIn.reflection)}
                          </Text>
                        )}
                        <TouchableOpacity style={styles.editCheckInButton} onPress={handleEditCheckIn}>
                          <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {activeCheckInTab === 'evening' && morningCheckIn && eveningCheckIn && evaluation && (
                      <View style={styles.evaluationCard}>
                        <Text style={styles.evaluationText}>{evaluation}</Text>
                      </View>
                    )}
                  </>
                )}
              </>
            );
          })()}
        </View>

        <View style={styles.microCopyCard}>
          <Text style={styles.microCopyText}>Today is a fresh chance for a small win.</Text>
        </View>

        <Text style={styles.todaysActionsTitle}>TODAY’S ACTIONS</Text>
        <View style={styles.actionsCard}>
          {(() => {
            const sortedItems = getSortedActions(habits, todos, goalTasks, state);
            const incompleteItems = sortedItems.filter(item => !item.completed);
            const completedItems = sortedItems.filter(item => item.completed);
            
            if (sortedItems.length === 0) {
              return (
                <>
                  <View style={styles.emptyActionsState}>
                    <Text style={styles.emptyText}>No actions for today</Text>
                  </View>
                  <View style={styles.addTodoInlineContainer}>
                    <TextInput
                      style={styles.addTodoInlineInput}
                      placeholder="Add a quick task..."
                      placeholderTextColor={Colors.textSecondary}
                      value={newTodoTitle}
                      onChangeText={setNewTodoTitle}
                      onSubmitEditing={handleAddTodo}
                    />
                    <TouchableOpacity
                      style={styles.addInlineButton}
                      onPress={handleAddTodo}
                    >
                      <Plus size={20} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                </>
              );
            }
            
            return (
              <>
                {incompleteItems.map((item) => {
                  const goal = item.goalId ? state.goals.find((g: any) => g.id === item.goalId) : undefined;
                  
                  if (item.type === 'habit') {
                    const habit = item.data as ReturnType<typeof useTodayHabits>[number];
                    return (
                      <ActionCard
                        key={item.id}
                        item={item}
                        onToggle={() => handleHabitToggle(habit.id)}
                        onEdit={() => handleEditHabit(habit.id)}
                        goal={goal}
                      />
                    );
                  } else {
                    const todo = item.data as Todo;
                    const isGoalTask = item.goalId !== undefined;
                    return (
                      <ActionCard
                        key={item.id}
                        item={item}
                        onToggle={() => (isGoalTask ? toggleGoalTask(todo.id) : handleTodoToggle(todo.id))}
                        onEdit={() => handleTaskEdit(todo.id, isGoalTask)}
                        goal={goal}
                      />
                    );
                  }
                })}

                {completedItems.length > 0 && (
                  <View style={styles.completedSection}>
                    <TouchableOpacity
                      style={styles.completedHeader}
                      onPress={() => {
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        setIsCompletedExpanded(!isCompletedExpanded);
                      }}
                    >
                      <Text style={styles.completedHeaderText}>Completed ({completedItems.length})</Text>
                      {isCompletedExpanded ? (
                        <ChevronDown size={20} color={Colors.textSecondary} />
                      ) : (
                        <ChevronRight size={20} color={Colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                    {isCompletedExpanded && completedItems.map((item) => {
                      const goal = item.goalId ? state.goals.find((g: any) => g.id === item.goalId) : undefined;
                      
                      if (item.type === 'habit') {
                        const habit = item.data as ReturnType<typeof useTodayHabits>[number];
                        return (
                          <ActionCard
                            key={item.id}
                            item={item}
                            onToggle={() => handleHabitToggle(habit.id)}
                            onEdit={() => handleEditHabit(habit.id)}
                            goal={goal}
                          />
                        );
                      } else {
                        const todo = item.data as Todo;
                        const isGoalTask = item.goalId !== undefined;
                        return (
                          <ActionCard
                            key={item.id}
                            item={item}
                            onToggle={() => (isGoalTask ? toggleGoalTask(todo.id) : handleTodoToggle(todo.id))}
                            onEdit={() => handleTaskEdit(todo.id, isGoalTask)}
                            goal={goal}
                          />
                        );
                      }
                    })}
                  </View>
                )}

                <View style={styles.addTodoInlineContainer}>
                  <TextInput
                    style={styles.addTodoInlineInput}
                    placeholder="Add a quick task..."
                    placeholderTextColor={Colors.textSecondary}
                    value={newTodoTitle}
                    onChangeText={setNewTodoTitle}
                    onSubmitEditing={handleAddTodo}
                  />
                  <TouchableOpacity
                    style={styles.addInlineButton}
                    onPress={handleAddTodo}
                  >
                    <Plus size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </>
            );
          })()}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </>
  );
}

const getTaskChronologyValue = (task: { createdAt?: string }) => {
  if (!task?.createdAt) return 0;
  const timestamp = new Date(task.createdAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const AnimatedActionTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function ActionCard({ 
  item, 
  onToggle,
  onEdit,
  goal,
}: { 
  item: {
    id: string;
    type: 'habit' | 'task';
    data: any;
    completed: boolean;
  };
  onToggle: () => void;
  onEdit: () => void;
  goal?: any;
}) {
  const isCompleted = item.completed;
  const isHabit = item.type === 'habit';
  const habitData = isHabit ? item.data : null;
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeLimit = 80;

  const resetPosition = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: false,
      bounciness: 6,
    }).start();
  }, [translateX]);

  const handleEdit = useCallback(() => {
    console.log(`[ActionCard] Edit triggered for item ${item.id}`);
    onEdit();
  }, [item.id, onEdit]);

  const handleSwipeSuccess = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    handleEdit();
  }, [handleEdit]);

  const handleTogglePress = useCallback(() => {
    console.log(`[ActionCard] Toggle pressed for item ${item.id}`);
    onToggle();
  }, [item.id, onToggle]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const horizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
          return horizontal && Math.abs(gestureState.dx) > 10;
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx < 0) {
            translateX.setValue(Math.max(gestureState.dx, -swipeLimit));
          } else {
            translateX.setValue(gestureState.dx * 0.2);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -50) {
            Animated.sequence([
              Animated.timing(translateX, {
                toValue: -swipeLimit,
                duration: 120,
                useNativeDriver: false,
              }),
              Animated.timing(translateX, {
                toValue: 0,
                duration: 180,
                useNativeDriver: false,
              }),
            ]).start();
            handleSwipeSuccess();
          } else {
            resetPosition();
          }
        },
        onPanResponderTerminate: () => {
          resetPosition();
        },
      }),
    [handleSwipeSuccess, resetPosition, swipeLimit, translateX]
  );

  const getFrequencyText = () => {
    if (!habitData) return '';
    if (habitData.frequency === 'daily') return 'Daily';
    if (habitData.frequency === 'weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      if (!habitData.weekDays || habitData.weekDays.length === 0) return 'Weekly';
      return `Weekly on ${habitData.weekDays.map((d: number) => days[d]).join(', ')}`;
    }
    return '';
  };

  return (
    <AnimatedActionTouchable
      {...panResponder.panHandlers}
      testID={`action-card-${item.id}`}
      style={[styles.actionCard, isCompleted && styles.actionCardCompleted, { transform: [{ translateX }] }]}
      activeOpacity={1}
    >
      <View style={styles.actionContent}>
        <TouchableOpacity
          onPress={handleTogglePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.checkButton}
          activeOpacity={0.8}
          testID={`action-card-toggle-${item.id}`}
        >
          {isCompleted ? (
            <Ionicons name="checkmark-circle-outline" size={24} color={Colors.textSecondary} />
          ) : (
            <Ionicons name="ellipse-outline" size={24} color={Colors.textSecondary} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionInteractiveArea}
          onPress={handleEdit}
          activeOpacity={0.85}
          testID={`action-card-edit-${item.id}`}
        >
          <View style={styles.actionTextContainer}>
            <Text style={[styles.actionTitle, isCompleted && styles.actionTitleCompleted]}>
              {item.data.title}
            </Text>
            {goal && (
              <Text style={styles.actionSubtext}>{goal.title}</Text>
            )}
          </View>
          <View style={styles.actionRightContainer}>
            <View style={[styles.actionTag, isHabit ? styles.actionTagHabit : styles.actionTagTask]}>
              {isHabit ? (
                <Ionicons name="repeat-outline" size={12} color="#AF9BFF" style={{ marginRight: 4 }} />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={12} color="#4A9DFF" style={{ marginRight: 4 }} />
              )}
              <Text style={[styles.actionTagText, isHabit ? { color: '#AF9BFF' } : { color: '#4A9DFF' }]}> 
                {isHabit ? 'Habit' : 'Task'}
              </Text>
            </View>
            {isHabit && (
              <Text style={styles.habitFrequencyTextRight}>{getFrequencyText()}</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </AnimatedActionTouchable>
  );
}

function WeekPreview({ isCompletedToday }: { isCompletedToday: boolean }) {
  const today = new Date();
  const days = [];
  
  for (let i = -3; i <= 3; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    days.push({
      date,
      isToday: i === 0,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate(),
    });
  }

  return (
    <View style={styles.weekPreview}>
      {days.map((day, index) => (
        <View
          key={index}
          style={[
            styles.dayItem,
            day.isToday && styles.dayItemToday,
          ]}
        >
          <Text style={[styles.dayName, day.isToday && styles.dayNameToday]}>
            {day.dayName}
          </Text>
          <View style={[styles.dayCircle, day.isToday && styles.dayCircleToday]}>
            {day.isToday && isCompletedToday ? (
              <Ionicons name="checkmark-circle-outline" size={20} color={Colors.primary} />
            ) : (
              <Text style={[styles.dayNum, day.isToday && styles.dayNumToday]}>
                {day.dayNum}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const VISION_PROMPT = `You are Journify’s Vision Essence Generator.

Your job is to create a single short sentence that captures the essence of what the user wants in their life and who they want to become.

Use the following data:
- The user’s vision statement
- The user’s chosen life areas
- The user’s active goals (1–3), with more emphasis on their designated focused goal.
- The user’s "why" behind these goals

Your output:
- ONE short sentence (12–16 words max)
- Calm, warm, supportive tone
- Identity-based or life-experience based (NOT task-based)
- Gentle and poetic, not motivational or forceful
- Must feel like a unifying theme across all goals and life areas
- MUST NOT list tasks or steps
- MUST NOT include more than 3 abstract qualities

Instructions:
1. Identify the emotional and lifestyle themes across all inputs.
2. Synthesize them into one essence.
3. Describe the person the user is becoming OR the life they are creating.
4. Keep it simple, beautiful, and easy to read.

⭐ LOGIC RULES THE MODEL SHOULD FOLLOW
Rule 1 — Identity > Goals
Always focus on WHO they’re becoming, not WHAT they’re doing.
Rule 2 — Essence > Specifics
Blend themes into a general life direction.
Rule 3 — Harmonize Multiple Goals
If 3 goals exist:
Extract the common emotional denominator (e.g., stability, growth, connection)
Reflect that, not each goal separately

Rule 4 — Consistency of Tone
Always warm, gentle, calm — Journify tone.
Rule 5 — No Pressure
Avoid words like:
must
need
should
push
Use:
becoming
creating
growing
moving toward`;

function VisionEssenceCard({ state }: { state: AppState }) {
  const activeGoals = useMemo(
    () => state.goals.filter(goal => !goal.completedAt && goal.status !== 'archived'),
    [state.goals]
  );
  const focusGoal = useMemo(() => activeGoals.find(goal => goal.isFocusGoal), [activeGoals]);
  const prioritizedGoals = useMemo(() => {
    if (focusGoal) {
      const rest = activeGoals.filter(goal => goal.id !== focusGoal.id);
      return [focusGoal, ...rest].slice(0, 3);
    }
    return activeGoals.slice(0, 3);
  }, [activeGoals, focusGoal]);
  const lifeAreas = useMemo(() => state.userProfile?.lifeAreaRanking ?? [], [state.userProfile?.lifeAreaRanking]);
  const interests = useMemo(() => state.userProfile?.interests ?? [], [state.userProfile?.interests]);
  const visionText = state.vision?.text?.trim();

  const hasInputs = Boolean(
    (visionText && visionText.length > 0) ||
    prioritizedGoals.length > 0 ||
    lifeAreas.length > 0 ||
    interests.length > 0
  );

  const contextDetails = useMemo(() => {
    const lines: string[] = [];
    if (visionText) {
      lines.push(`Vision statement: ${visionText}`);
    }
    if (lifeAreas.length > 0) {
      lines.push(`Life areas: ${lifeAreas.join(', ')}`);
    }
    if (interests.length > 0) {
      lines.push(`Interests: ${interests.join(', ')}`);
    }
    if (prioritizedGoals.length > 0) {
      prioritizedGoals.forEach((goal, index) => {
        const whyText = goal.why ? `Why: ${goal.why}` : 'Why: not specified';
        const emphasis = goal.isFocusGoal ? 'Focus goal' : `Goal ${index + 1}`;
        const area = goal.lifeArea ? `Life area: ${goal.lifeArea}` : undefined;
        const detailsParts = [emphasis, goal.title, whyText, area].filter(Boolean);
        lines.push(detailsParts.join(' | '));
      });
    }
    return lines.join('\n');
  }, [visionText, lifeAreas, interests, prioritizedGoals]);

  const queryKeyPayload = useMemo(() => ({
    vision: visionText ?? '',
    goals: prioritizedGoals.map(goal => ({
      id: goal.id,
      title: goal.title,
      why: goal.why ?? '',
      lifeArea: goal.lifeArea ?? '',
      isFocusGoal: goal.isFocusGoal ?? false,
    })),
    lifeAreas,
    interests,
  }), [visionText, prioritizedGoals, lifeAreas, interests]);

  const { data, isFetching, isRefetching, isError } = useQuery({
    queryKey: ['vision-essence', queryKeyPayload, contextDetails],
    queryFn: async () => {
      console.log('[VisionEssenceCard] Generating new vision essence');
      const response = await generateText({
        messages: [
          {
            role: 'user',
            content: `${VISION_PROMPT}\n\nUser data:\n${contextDetails}`,
          },
        ],
        temperature: 0.65,
        topP: 0.85,
        frequencyPenalty: 0.25,
        presencePenalty: 0.2,
      });
      const cleaned = response.replace(/^["'\s]+|["'\s]+$/g, '').replace(/\s+/g, ' ').trim();
      if (!cleaned) {
        throw new Error('Empty response from generator');
      }
      console.log('[VisionEssenceCard] Vision essence ready');
      return cleaned;
    },
    enabled: hasInputs,
    staleTime: 1000 * 60 * 30,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  if (!hasInputs) {
    return null;
  }

  const showSpinner = !data && (isFetching || isRefetching);

  return (
    <View>
      <Text style={styles.checkInTitleOutside}>YOUR NORTH STAR</Text>
      <View style={styles.visionCard} testID="vision-essence-card">
        <View style={styles.visionCardBody}>
          {showSpinner && (
            <ActivityIndicator size="small" color={Colors.tealSoft} />
          )}
          {!showSpinner && data && (
            <Text style={styles.visionCardText} testID="vision-essence-text">{data}</Text>
          )}
          {!showSpinner && isError && (
            <Text style={styles.visionCardErrorText}>Unable to load right now.</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDeep,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 14,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  levelBadgeContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  levelBadgeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.glassBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
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
  levelTextRight: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  xpText: {
    fontSize: 11,
    color: Colors.textSub,
    fontWeight: '500',
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 4,
  },
  weekPreview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    marginHorizontal: 14,
    backgroundColor: Colors.glassBg,
    borderRadius: 20,
  },
  dayItem: {
    alignItems: 'center',
    gap: 8,
  },
  dayItemToday: {
    transform: [{ scale: 1.1 }],
  },
  dayName: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dayNameToday: {
    color: Colors.text,
    fontWeight: '700',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(4, 22, 30, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleToday: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  dayNum: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  dayNumToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
  microCopyCard: {
    marginHorizontal: 14,
    marginBottom: 16,
    backgroundColor: Colors.glassBg,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  microCopyText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.2,
    lineHeight: 20,
  },
  visionCard: {
    marginHorizontal: 14,
    marginBottom: 16,
    backgroundColor: 'rgba(8, 32, 41, 0.95)',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 28,
  },
  visionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  visionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visionIconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(50, 208, 193, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  visionRefreshButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  visionRefreshButtonDisabled: {
    opacity: 0.45,
  },
  visionRefreshButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    letterSpacing: 0.4,
  },
  visionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  visionCardBody: {
    minHeight: 42,
  },
  visionCardText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
    fontWeight: '500',
  },
  visionCardErrorText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  visionErrorRow: {
    paddingVertical: 4,
  },
  journalSection: {
    marginHorizontal: 14,
    marginBottom: 16,
    backgroundColor: Colors.glassBg,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  journalInput: {
    backgroundColor: 'rgba(4, 22, 30, 0.9)',
    borderRadius: 14,
    padding: 10,
    fontSize: 13,
    color: Colors.text,
    minHeight: 48,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  moodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    gap: 6,
  },
  moodButton: {
    flex: 1,
    minHeight: 70,
    paddingVertical: 8,
    backgroundColor: 'rgba(5, 26, 36, 0.96)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  moodButtonSelected: {
    borderColor: Colors.tealSoft,
    backgroundColor: 'rgba(107, 230, 218, 0.15)',
    transform: [{ scale: 1.05 }],
  },
  moodEmoji: {
    fontSize: 20,
  },
  moodLabel: {
    fontSize: 10,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  reflectButton: {
    backgroundColor: Colors.tealMain,
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  reflectButtonDisabled: {
    opacity: 0.6,
  },
  reflectButtonText: {
    color: '#031013',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  checkInTitleOutside: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 14,
  },
  todaysActionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 14,
  },
  actionsCard: {
    backgroundColor: Colors.glassBg,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 14,
    marginBottom: 24,
  },
  emptyActionsState: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  addTodoInlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  addTodoInlineInput: {
    flex: 1,
    backgroundColor: 'rgba(4, 22, 30, 0.5)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.text,
  },
  addInlineButton: {
    backgroundColor: 'rgba(50, 208, 193, 0.15)',
    borderRadius: 14,
    padding: 10,
  },
  emptyState: {
    backgroundColor: Colors.glassBg,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  goalTaskCard: {
    backgroundColor: Colors.glassBg,
    borderRadius: 22,
    padding: 16,
    marginBottom: 8,
  },
  goalTaskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalTaskTextContainer: {
    flex: 1,
  },
  goalTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalTaskTitle: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  goalTaskSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  todoCard: {
    backgroundColor: 'rgba(4, 22, 30, 0.5)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 8,
  },
  todoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  todoTextContainer: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  actionCard: {
    backgroundColor: 'rgba(4, 22, 30, 0.5)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  actionCardCompleted: {
    backgroundColor: 'rgba(4, 22, 30, 0.3)',
    borderColor: 'transparent',
    opacity: 0.7,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionInteractiveArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  actionTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  actionSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  actionTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionTagHabit: {
    backgroundColor: 'rgba(175, 155, 255, 0.15)', // Purple bg
    borderColor: 'rgba(175, 155, 255, 0.6)', // Purple border
  },
  actionTagTask: {
    backgroundColor: 'rgba(74, 157, 255, 0.15)', // Blue bg
    borderColor: 'rgba(74, 157, 255, 0.6)', // Blue border
  },
  actionTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionRightContainer: {
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: 120,
  },
  habitFrequencyTextRight: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  habitFrequencyText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  goalCard: {
    backgroundColor: Colors.glassBg,
    borderRadius: 22,
    padding: 16,
    marginBottom: 8,
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  goalNextAction: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  lifeAreaIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
  completedSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  completedHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  checkInTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 10,
  },
  checkInTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  checkInTabActive: {
    borderBottomColor: Colors.primary,
  },
  checkInTabText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  checkInTabTextActive: {
    color: Colors.primary,
  },
  checkInSubtext: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
    fontWeight: '500',
  },
  checkInSummaryCard: {
    backgroundColor: 'rgba(4, 22, 30, 0.9)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  checkInSummaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkInEmoji: {
    fontSize: 32,
  },
  checkInSummaryText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  editCheckInButton: {
    padding: 8,
  },
  checkInMessageCard: {
    backgroundColor: 'rgba(50, 208, 193, 0.15)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  checkInMessage: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    fontWeight: '500',
  },
  evaluationCard: {
    backgroundColor: Colors.glassBg,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  evaluationText: {
    fontSize: 14,
    color: Colors.primary,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
});
