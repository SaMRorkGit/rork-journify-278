import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppState, JournalEntry, Todo, GoalTask, Habit, Goal, UserProfile, Vision, Aspiration, DailyCheckIn, VisionGuideResponse, VisionGuideSession } from '../types';
import { useToast } from './ToastContext';

const STORAGE_KEY = 'growth-app-state';

const normalizeGoal = (goal: Goal): Goal => ({
  ...goal,
  status: goal.status ?? 'active',
});

const initialState: AppState = {
  journalEntries: [],
  dailyCheckIns: [],
  todos: [],
  goalTasks: [],
  habits: [],
  goals: [],
  userProgress: {
    xp: 0,
    level: 1,
  },
  userProfile: undefined,
  vision: undefined,
  aspirations: [],
  visionGuideSession: undefined,
  focusGoalId: undefined,
  focusGoalSelectionMode: 'auto',
};

const getDefaultFocusGoalId = (goals: Goal[]): string | undefined => {
  const activeGoals = goals.filter(goal => !goal.completedAt && goal.status !== 'archived' && goal.status !== 'completed');
  if (activeGoals.length === 0) {
    return undefined;
  }

  const ordered = [...activeGoals].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return aTime - bTime;
  });

  return ordered[0]?.id;
};

const applyFocusGoalPreferences = (
  baseState: AppState,
  options?: { selectionMode?: 'auto' | 'manual'; focusGoalId?: string }
): AppState => {
  const activeGoals = baseState.goals.filter(goal => !goal.completedAt && goal.status !== 'archived' && goal.status !== 'completed');
  let selectionMode = options?.selectionMode ?? baseState.focusGoalSelectionMode ?? 'auto';
  let focusGoalId = options?.focusGoalId ?? baseState.focusGoalId;

  if (selectionMode === 'auto') {
    focusGoalId = getDefaultFocusGoalId(activeGoals);
  } else if (focusGoalId && !activeGoals.some(goal => goal.id === focusGoalId)) {
    selectionMode = 'auto';
    focusGoalId = getDefaultFocusGoalId(activeGoals);
  }

  const goalsWithFocus = baseState.goals.map(goal => ({
    ...goal,
    isFocusGoal: Boolean(focusGoalId) && goal.id === focusGoalId && goal.status !== 'archived' && goal.status !== 'completed',
  }));

  return {
    ...baseState,
    goals: goalsWithFocus,
    focusGoalId,
    focusGoalSelectionMode: selectionMode,
  };
};

const noopShowToast = () => {};

export const [AppStateProvider, useAppState] = createContextHook(() => {
  const toastContext = useToast();
  const showToast = useMemo(() => toastContext?.showToast ?? noopShowToast, [toastContext?.showToast]);
  const [state, setState] = useState<AppState>(initialState);

  const [hasInitialized, setHasInitialized] = useState(false);

  const stateQuery = useQuery({
    queryKey: ['appState'],
    queryFn: async () => {
      console.log('[AppState] Loading state from storage...');
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!stored) {
          console.log('[AppState] No stored state found, using initial state');
          return initialState;
        }
        
        const parsedState = JSON.parse(stored);
        const storedGoals: Goal[] = (parsedState.goals || []).map(normalizeGoal);
        const storedFocusGoalId: string | undefined = parsedState.focusGoalId ?? storedGoals.find(goal => goal.isFocusGoal)?.id;
        const storedSelectionMode: 'auto' | 'manual' = parsedState.focusGoalSelectionMode ?? (storedFocusGoalId ? 'manual' : 'auto');

        const mergedState: AppState = {
          ...initialState,
          ...parsedState,
          goals: storedGoals,
          todos: parsedState.todos || parsedState.tasks || [],
          goalTasks: parsedState.goalTasks || [],
          aspirations: parsedState.aspirations || [],
          dailyCheckIns: parsedState.dailyCheckIns || [],
          userProgress: parsedState.userProgress || initialState.userProgress,
          focusGoalId: storedFocusGoalId,
          focusGoalSelectionMode: storedSelectionMode,
        };

        console.log('[AppState] State loaded successfully');
        return applyFocusGoalPreferences(mergedState);
      } catch (error) {
        console.error('[AppState] Error loading state:', error);
        return initialState;
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const saveMutation = useMutation({
    mutationFn: async (newState: AppState) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return newState;
    },
  });

  const { mutate: saveToStorage } = saveMutation;

  useEffect(() => {
    if (stateQuery.data) {
      console.log('[AppState] Setting state from query data');
      setState(stateQuery.data);
      setHasInitialized(true);
    }
  }, [stateQuery.data]);

  useEffect(() => {
    if (stateQuery.isError) {
      console.error('[AppState] Query error, using initial state');
      setState(initialState);
      setHasInitialized(true);
    }
  }, [stateQuery.isError]);

  const calculateXPForLevel = useCallback((level: number): number => {
    return Math.floor(100 * Math.pow(level, 1.5));
  }, []);

  const addJournalEntry = useCallback((entry: JournalEntry) => {
    setState(prevState => {
      const newXP = prevState.userProgress.xp + 10;
      let newLevel = prevState.userProgress.level;
      let remainingXP = newXP;

      while (remainingXP >= calculateXPForLevel(newLevel)) {
        remainingXP -= calculateXPForLevel(newLevel);
        newLevel++;
      }

      const newState = {
        ...prevState,
        journalEntries: [entry, ...prevState.journalEntries],
        userProgress: {
          xp: remainingXP,
          level: newLevel,
        },
      };

      console.log(`[XP] Awarded 10 XP for journaling. Level: ${newLevel}, XP: ${remainingXP}/${calculateXPForLevel(newLevel)}`);

      saveToStorage(newState);
      return newState;
    });
    showToast('Your reflection is saved');
  }, [saveToStorage, calculateXPForLevel, showToast]);

  const updateJournalEntry = useCallback((id: string, updates: Partial<JournalEntry>) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        journalEntries: prevState.journalEntries.map(entry =>
          entry.id === id ? { ...entry, ...updates } : entry
        ),
      };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const addTodo = useCallback((todo: Todo) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        todos: [...prevState.todos, todo],
      };
      console.log(`[Todo] Added task: ${todo.title}`);
      saveToStorage(newState);
      return newState;
    });
    showToast('Task added');
  }, [saveToStorage, showToast]);

  const updateTodo = useCallback((id: string, updates: Partial<Todo>) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        todos: prevState.todos.map(t => t.id === id ? { ...t, ...updates } : t),
      };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const toggleTodo = useCallback((id: string) => {
    let completedToast = false;
    setState(prevState => {
      const todo = prevState.todos.find(t => t.id === id);
      if (!todo) return prevState;

      const wasCompleted = todo.completed;
      const isNowCompleted = !wasCompleted;
      completedToast = isNowCompleted;
      const xpChange = isNowCompleted ? 5 : -5;

      const newXP = Math.max(0, prevState.userProgress.xp + xpChange);
      let newLevel = prevState.userProgress.level;
      let remainingXP = newXP;

      if (isNowCompleted) {
        while (remainingXP >= calculateXPForLevel(newLevel)) {
          remainingXP -= calculateXPForLevel(newLevel);
          newLevel++;
        }
      }

      const newState = {
        ...prevState,
        todos: prevState.todos.map(t =>
          t.id === id
            ? {
                ...t,
                completed: isNowCompleted,
                completedAt: isNowCompleted ? new Date().toISOString() : undefined,
              }
            : t
        ),
        userProgress: {
          xp: remainingXP,
          level: newLevel,
        },
      };

      if (isNowCompleted) {
        console.log(`[XP] Awarded 5 XP for completing todo. Level: ${newLevel}, XP: ${remainingXP}/${calculateXPForLevel(newLevel)}`);
      }

      saveToStorage(newState);
      return newState;
    });
    if (completedToast) {
      showToast('Task completed, great job!');
    }
  }, [saveToStorage, calculateXPForLevel, showToast]);

  const deleteTodo = useCallback((id: string) => {
    let deleted = false;
    setState(prevState => {
      if (!prevState.todos.some(t => t.id === id)) {
        return prevState;
      }
      deleted = true;
      const newState = {
        ...prevState,
        todos: prevState.todos.filter(t => t.id !== id),
      };
      console.log(`[Todo] Deleted task id: ${id}`);
      saveToStorage(newState);
      return newState;
    });
    if (deleted) {
      showToast('Task deleted');
    }
  }, [saveToStorage, showToast]);

  const reorderTodos = useCallback((todos: Todo[]) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        todos,
      };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const addGoalTask = useCallback((task: GoalTask) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        goalTasks: [...prevState.goalTasks, task],
      };
      console.log(`[GoalTask] Added task: ${task.title}`);
      saveToStorage(newState);
      return newState;
    });
    showToast('Task added');
  }, [saveToStorage, showToast]);

  const updateGoalTask = useCallback((id: string, updates: Partial<GoalTask>) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        goalTasks: prevState.goalTasks.map(t => t.id === id ? { ...t, ...updates } : t),
      };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const toggleGoalTask = useCallback((id: string) => {
    let completedToast = false;
    setState(prevState => {
      const task = prevState.goalTasks.find(t => t.id === id);
      if (!task) return prevState;

      const wasCompleted = task.completed;
      const isNowCompleted = !wasCompleted;
      completedToast = isNowCompleted;
      const xpChange = isNowCompleted ? 8 : -8;

      const newXP = Math.max(0, prevState.userProgress.xp + xpChange);
      let newLevel = prevState.userProgress.level;
      let remainingXP = newXP;

      if (isNowCompleted) {
        while (remainingXP >= calculateXPForLevel(newLevel)) {
          remainingXP -= calculateXPForLevel(newLevel);
          newLevel++;
        }
      }

      const newState = {
        ...prevState,
        goalTasks: prevState.goalTasks.map(t =>
          t.id === id
            ? {
                ...t,
                completed: isNowCompleted,
                completedAt: isNowCompleted ? new Date().toISOString() : undefined,
              }
            : t
        ),
        userProgress: {
          xp: remainingXP,
          level: newLevel,
        },
      };

      if (isNowCompleted) {
        console.log(`[XP] Awarded 8 XP for completing goal task. Level: ${newLevel}, XP: ${remainingXP}/${calculateXPForLevel(newLevel)}`);
      }

      saveToStorage(newState);
      return newState;
    });
    if (completedToast) {
      showToast('Task completed, great job!');
    }
  }, [saveToStorage, calculateXPForLevel, showToast]);

  const deleteGoalTask = useCallback((id: string) => {
    let deleted = false;
    setState(prevState => {
      if (!prevState.goalTasks.some(t => t.id === id)) {
        return prevState;
      }
      deleted = true;
      const newState = {
        ...prevState,
        goalTasks: prevState.goalTasks.filter(t => t.id !== id),
      };
      console.log(`[GoalTask] Deleted task id: ${id}`);
      saveToStorage(newState);
      return newState;
    });
    if (deleted) {
      showToast('Task deleted');
    }
  }, [saveToStorage, showToast]);

  const addHabit = useCallback((habit: Habit) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        habits: [habit, ...prevState.habits],
      };
      saveToStorage(newState);
      return newState;
    });
    showToast('Habit created');
  }, [saveToStorage, showToast]);

  const updateHabit = useCallback((id: string, updates: Partial<Habit>) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        habits: prevState.habits.map(h => h.id === id ? { ...h, ...updates } : h),
      };
      saveToStorage(newState);
      return newState;
    });
    showToast('Habit saved');
  }, [saveToStorage, showToast]);

  const toggleHabitCompletion = useCallback((id: string, date: string, value?: number) => {
    let completedToast = false;
    setState(prevState => {
      const habit = prevState.habits.find(h => h.id === id);
      if (!habit) return prevState;

      const dateStr = date.split('T')[0] || '';
      const wasCompleted = habit.completedDates.includes(dateStr);
      const isNowCompleted = !wasCompleted;
      completedToast = isNowCompleted;
      const xpChange = isNowCompleted ? 7 : -7;

      const newXP = Math.max(0, prevState.userProgress.xp + xpChange);
      let newLevel = prevState.userProgress.level;
      let remainingXP = newXP;

      if (isNowCompleted) {
        while (remainingXP >= calculateXPForLevel(newLevel)) {
          remainingXP -= calculateXPForLevel(newLevel);
          newLevel++;
        }
      }

      const newState = {
        ...prevState,
        habits: prevState.habits.map(h =>
          h.id === id
            ? {
                ...h,
                completedDates: isNowCompleted
                  ? [...h.completedDates, dateStr]
                  : h.completedDates.filter(d => d !== dateStr),
                trackingData: value !== undefined
                  ? { ...h.trackingData, [dateStr]: value }
                  : h.trackingData,
              }
            : h
        ),
        userProgress: {
          xp: remainingXP,
          level: newLevel,
        },
      };

      if (isNowCompleted) {
        console.log(`[XP] Awarded 7 XP for completing habit. Level: ${newLevel}, XP: ${remainingXP}/${calculateXPForLevel(newLevel)}`);
      }

      saveToStorage(newState);
      return newState;
    });
    if (completedToast) {
      showToast('Habit done, good job staying consistent!!');
    }
  }, [saveToStorage, calculateXPForLevel, showToast]);

  const deleteHabit = useCallback((id: string) => {
    let deleted = false;
    setState(prevState => {
      if (!prevState.habits.some(h => h.id === id)) {
        return prevState;
      }
      deleted = true;
      const updatedGoals = prevState.goals.map(goal => {
        if (goal.habitIds?.includes(id)) {
          return {
            ...goal,
            habitIds: goal.habitIds.filter(hId => hId !== id),
          };
        }
        return goal;
      });

      const newState = {
        ...prevState,
        habits: prevState.habits.filter(h => h.id !== id),
        goals: updatedGoals,
      };
      console.log(`[Habit] Deleted habit with id: ${id}`);
      saveToStorage(newState);
      return newState;
    });
    if (deleted) {
      showToast('Habit deleted');
    }
  }, [saveToStorage, showToast]);

  const addGoal = useCallback((goal: Goal) => {
    setState(prevState => {
      const baseState = {
        ...prevState,
        goals: [normalizeGoal(goal), ...prevState.goals],
      };
      const newState = applyFocusGoalPreferences(baseState);
      saveToStorage(newState);
      return newState;
    });
    showToast('New goal added');
  }, [saveToStorage, showToast]);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>, options?: { toastMessage?: string }) => {
    setState(prevState => {
      const goal = prevState.goals.find(g => g.id === id);
      const wasCompleted = goal?.completedAt !== undefined;
      const isNowCompleted = updates.completedAt !== undefined;

      let newXP = prevState.userProgress.xp;
      let newLevel = prevState.userProgress.level;
      let remainingXP = newXP;

      if (!wasCompleted && isNowCompleted) {
        newXP += 20;
        remainingXP = newXP;

        while (remainingXP >= calculateXPForLevel(newLevel)) {
          remainingXP -= calculateXPForLevel(newLevel);
          newLevel++;
        }

        console.log(`[XP] Awarded 20 XP for completing goal. Level: ${newLevel}, XP: ${remainingXP}/${calculateXPForLevel(newLevel)}`);
      }

      const baseState = {
        ...prevState,
        goals: prevState.goals.map(g => (g.id === id ? normalizeGoal({ ...g, ...updates }) : g)),
        userProgress: {
          xp: remainingXP,
          level: newLevel,
        },
      };
      const newState = applyFocusGoalPreferences(baseState);

      saveToStorage(newState);
      return newState;
    });
    if (options?.toastMessage) {
      showToast(options.toastMessage);
    }
  }, [saveToStorage, calculateXPForLevel, showToast]);

  const setFocusGoal = useCallback((goalId?: string) => {
    setState(prevState => {
      const baseState: AppState = {
        ...prevState,
        focusGoalId: goalId,
        focusGoalSelectionMode: 'manual',
      };
      const newState = applyFocusGoalPreferences(baseState, {
        selectionMode: 'manual',
        focusGoalId: goalId,
      });

      saveToStorage(newState);
      return newState;
    });
    showToast(goalId ? 'Focus goal pinned' : 'Focus goal cleared');
  }, [saveToStorage, showToast]);

  const deleteGoal = useCallback((id: string) => {
    let deleted = false;
    setState(prevState => {
      if (!prevState.goals.some(g => g.id === id)) {
        return prevState;
      }

      deleted = true;
      const remainingGoalTasks = prevState.goalTasks.filter(task => task.goalId !== id);
      const remainingHabits = prevState.habits.filter(habit => habit.goalId !== id);

      const baseState = {
        ...prevState,
        goals: prevState.goals.filter(goal => goal.id !== id),
        goalTasks: remainingGoalTasks,
        habits: remainingHabits,
      };
      const newState = applyFocusGoalPreferences(baseState);

      saveToStorage(newState);
      return newState;
    });
    if (deleted) {
      showToast('Goal deleted');
    }
  }, [saveToStorage, showToast]);

  const awardXP = useCallback((amount: number, reason: string) => {
    setState(prevState => {
      const newXP = prevState.userProgress.xp + amount;
      let newLevel = prevState.userProgress.level;
      let remainingXP = newXP;

      while (remainingXP >= calculateXPForLevel(newLevel)) {
        remainingXP -= calculateXPForLevel(newLevel);
        newLevel++;
      }

      const newState = {
        ...prevState,
        userProgress: {
          xp: remainingXP,
          level: newLevel,
        },
      };

      console.log(`[XP] Awarded ${amount} XP for ${reason}. Level: ${newLevel}, XP: ${remainingXP}/${calculateXPForLevel(newLevel)}`);
      
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage, calculateXPForLevel]);

  const updateUserProfile = useCallback((profile: Partial<UserProfile>) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        userProfile: {
          ...prevState.userProfile,
          ...profile,
        } as UserProfile,
      };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const updateVision = useCallback((vision: Vision) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        vision,
      };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const deleteVision = useCallback(() => {
    setState(prevState => {
      const newState = {
        ...prevState,
        vision: undefined,
      };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const saveVisionGuideResponse = useCallback((response: VisionGuideResponse) => {
    setState(prevState => {
      const session: VisionGuideSession = prevState.visionGuideSession ?? { responses: [] };
      const existingIndex = session.responses.findIndex(r => r.id === response.id);
      const updatedResponses = existingIndex > -1
        ? session.responses.map((r, index) => (index === existingIndex ? response : r))
        : [...session.responses, response];

      const updatedSession: VisionGuideSession = {
        ...session,
        responses: updatedResponses,
        lastUpdated: response.updatedAt,
      };

      const newState = {
        ...prevState,
        visionGuideSession: updatedSession,
      };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const updateVisionGuideSession = useCallback((updates: Partial<VisionGuideSession>) => {
    setState(prevState => {
      const session: VisionGuideSession = prevState.visionGuideSession ?? { responses: [] };
      const updatedSession: VisionGuideSession = {
        ...session,
        ...updates,
        responses: updates.responses ?? session.responses,
        lastUpdated: updates.lastUpdated ?? session.lastUpdated ?? new Date().toISOString(),
      };

      const newState = {
        ...prevState,
        visionGuideSession: updatedSession,
      };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const clearVisionGuideSession = useCallback(() => {
    setState(prevState => {
      if (!prevState.visionGuideSession) {
        return prevState;
      }
      const newState = {
        ...prevState,
        visionGuideSession: undefined,
      };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const consumeVisionGuidePendingVision = useCallback(() => {
    setState(prevState => {
      if (!prevState.visionGuideSession?.pendingVision) {
        return prevState;
      }

      const newSession: VisionGuideSession = {
        ...prevState.visionGuideSession,
        pendingVision: undefined,
      };

      const newState = {
        ...prevState,
        visionGuideSession: newSession,
      };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const addAspiration = useCallback((aspiration: Aspiration) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        aspirations: [...prevState.aspirations, aspiration],
      };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const updateAspiration = useCallback((id: string, updates: Partial<Aspiration>) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        aspirations: prevState.aspirations.map(a => 
          a.id === id ? { ...a, ...updates } : a
        ),
      };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const deleteAspiration = useCallback((id: string) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        aspirations: prevState.aspirations.filter(a => a.id !== id),
      };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const addDailyCheckIn = useCallback((checkIn: DailyCheckIn) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        dailyCheckIns: [checkIn, ...prevState.dailyCheckIns],
      };
      saveToStorage(newState);
      return newState;
    });
    const toastMessage =
      checkIn.type === 'evening'
        ? 'Nice work checking in this evening. A moment of reflection is a gift to your future self.'
        : "Thanks for checking in. Let's take today one gentle step at a time.";
    showToast(toastMessage);
  }, [saveToStorage, showToast]);

  const updateDailyCheckIn = useCallback((id: string, updates: Partial<DailyCheckIn>) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        dailyCheckIns: prevState.dailyCheckIns.map(c => 
          c.id === id ? { ...c, ...updates } : c
        ),
      };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const isLoading = !hasInitialized && stateQuery.isLoading;

  return useMemo(() => ({
    state,
    isLoading,
    addJournalEntry,
    updateJournalEntry,
    addTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    reorderTodos,
    addGoalTask,
    updateGoalTask,
    toggleGoalTask,
    deleteGoalTask,
    addHabit,
    updateHabit,
    toggleHabitCompletion,
    deleteHabit,
    addGoal,
    updateGoal,
    deleteGoal,
    setFocusGoal,
    awardXP,
    calculateXPForLevel,
    updateUserProfile,
    updateVision,
    deleteVision,
    saveVisionGuideResponse,
    updateVisionGuideSession,
    clearVisionGuideSession,
    consumeVisionGuidePendingVision,
    addAspiration,
    updateAspiration,
    deleteAspiration,
    addDailyCheckIn,
    updateDailyCheckIn,
  }), [state, isLoading, addJournalEntry, updateJournalEntry, addTodo, updateTodo, toggleTodo, deleteTodo, reorderTodos, addGoalTask, updateGoalTask, toggleGoalTask, deleteGoalTask, addHabit, updateHabit, toggleHabitCompletion, deleteHabit, addGoal, updateGoal, deleteGoal, setFocusGoal, awardXP, calculateXPForLevel, updateUserProfile, updateVision, deleteVision, saveVisionGuideResponse, updateVisionGuideSession, clearVisionGuideSession, consumeVisionGuidePendingVision, addAspiration, updateAspiration, deleteAspiration, addDailyCheckIn, updateDailyCheckIn]);
});

export const useTodayTodos = () => {
  const { state } = useAppState();
  return state.todos;
};

export const useTodayGoalTasks = () => {
  const { state } = useAppState();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0] || '';
  
  return state.goalTasks.filter(task => {
    if (!task.dueDate) return true;
    const taskDate = task.dueDate;
    return taskDate === todayStr || (!task.completed && taskDate < todayStr);
  });
};

export const useTodayHabits = () => {
  const { state } = useAppState();
  const today = new Date();
  const dayOfWeek = today.getDay();
  const todayStr = today.toISOString().split('T')[0] || '';

  return state.habits.filter(habit => {
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekly' && habit.weekDays) {
      return habit.weekDays.includes(dayOfWeek);
    }
    return false;
  }).map(habit => {
    const completedToday = habit.completedDates.includes(todayStr);
    const todayValue = habit.trackingData?.[todayStr];
    return {
      ...habit,
      completedToday,
      todayValue,
    };
  });
};

export const useTodayGoals = () => {
  const { state } = useAppState();
  return state.goals.filter(goal => !goal.completedAt && goal.status !== 'archived' && goal.status !== 'completed');
};

export const useActiveGoals = () => {
  const { state } = useAppState();
  return state.goals.filter(goal => !goal.completedAt && goal.status !== 'archived' && goal.status !== 'completed');
};

export const useHabitStreak = (habitId: string) => {
  const { state } = useAppState();
  const habit = state.habits.find(h => h.id === habitId);
  
  if (!habit) return 0;

  const sortedDates = [...habit.completedDates].sort().reverse();
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sortedDates.length; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const checkDateStr = checkDate.toISOString().split('T')[0] || '';

    if (sortedDates.includes(checkDateStr)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

export const useGoalProgress = (goalId: string) => {
  const { state } = useAppState();
  const goal = state.goals.find(g => g.id === goalId);
  
  if (!goal) return 0;
  
  const goalTaskIds = goal.goalTaskIds || [];
  const habitIds = goal.habitIds || [];
  const totalItems = goalTaskIds.length + habitIds.length;
  
  if (totalItems === 0) return 0;

  const goalTasks = state.goalTasks.filter(t => goalTaskIds.includes(t.id));
  const completedTasks = goalTasks.filter(t => t.completed).length;
  
  const habits = state.habits.filter(h => habitIds.includes(h.id));
  const todayStr = new Date().toISOString().split('T')[0] || '';
  const completedHabits = habits.filter(h => h.completedDates.includes(todayStr)).length;
  
  return ((completedTasks + completedHabits) / totalItems) * 100;
};
