import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Award, ChevronDown, ChevronRight, Plus, Quote, Sparkles } from 'lucide-react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  PanResponder,
  Animated,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { generateText } from '@rork-ai/toolkit-sdk';
import { useAppState } from '../../contexts/AppStateContext';
import type { Todo, MoodType, DailyCheckIn, CheckInType, AppState, Habit } from '../../types';
import Colors from '../../constants/colors';

type HabitWithComputed = Habit & {
  completedToday: boolean;
  todayValue?: number;
  carriedFromDateKey?: string;
};

const DAILY_QUOTE_PROMPT = `Generate a short, meaningful daily quote for someone on a personal growth journey.

TONE REQUIREMENTS:
- Warm, gentle, and conversational (like a wise friend)
- Motivate and encourage without being preachy
- Honest about struggle; avoid toxic positivity
- Grounded in reality; avoid fantasy/mystical vibes
- Personal growth focused, not productivity focused
- Avoid hustle culture and shame-based motivation

STYLE:
- Keep it brief: 1–2 sentences
- No numbers, streak talk, or performance language
- Can be original or inspired by growth principles

VARIETY:
- Rotate to a different theme option daily; avoid repeating the same theme day-to-day.

THEME OPTIONS (pick ONE per day):
- Progress over perfection
- Small consistent steps
- Self-compassion
- Fresh starts
- Identity and becoming
- Acknowledging struggle
- Rest as part of growth
- Momentum, not streaks
- Being human, not perfect
- Trusting the process
- Motivate and encourage

AVOID:
- Hustle culture language ("grind", "crush", "dominate")
- Toxic positivity ("good vibes only", "just be happy")
- Shame or comparison language
- Corporate/LinkedIn inspiration
- Anything that could trigger inadequacy`;

const CHECK_IN_PROMPT = `You are a compassionate personal growth companion generating a check-in prompt. 

INPUT: 
- Time of day: [morning/midday/evening]
- Today's actions: [list of habits/tasks for today, e.g., "Morning walk, Review presentation, Take stairs"]

YOUR TASK: Generate ONE brief check-in prompt appropriate for each state based on time of day.

TONE REQUIREMENTS: 
- Warm and encouraging, like a caring friend, therapeutic 
- Conversational, not robotic or clinical 
- Very brief: 1 sentence only  
- Gentle, never demanding or guilt-inducing - Natural and simple 


MORNING PROMPTS: 
Help the user set intentions for their day. 
Focus on: possibility, what matters, fresh start energy 
Examples: - 
"What would make today feel meaningful?"
“What's your one thing today?"
"How do you want to show up today?" 
"What matters most today?"


MIDDAY PROMPTS: 
Quick, optional check-in on how the day is going. 
Focus on: brief touch-point, acknowledge reality, no pressure 
Examples: 
- "How's your day unfolding?"
- "How are you feeling about today so far?" 
- "What's going well?" 


EVENING PROMPTS: 
Invite reflection on the day with closure and peace. 
Focus on: honest reflection, celebrate what happened, calm closure Examples: 
- "How did today go?" 
- "What deserves celebration today, even if small?" 
- "What made today good or hard?" 
- "What are you taking from today into tomorrow?"
- “How was your energy today?”`;

const DAILY_SUMMARY_PROMPT = `You are Journify’s Daily Summary Assistant.

Your task is to generate a short, gentle summary of the user’s day using all available information, including:
• Mood check-in(s)
• Daily check-in responses
• Journal reflections
• Actions taken (tasks and habits)
• Any extracted themes, emotions, or wins

The summary should help the user feel seen, encouraged, and grounded.

STRUCTURE YOUR RESPONSE IN TWO SENTENCES:

1. First sentence:
   - Summarize how the day went overall.
   - Reflect the general emotional tone or experience of the day.
   - Use warm, non-judgmental language.
   - Do not mention specific times or actions in detail.

2. Second sentence:
   - Gently connect the user’s actions, reflections, or mindset to their goals, vision, or the person they are becoming.
   - Emphasize small steps, effort, or awareness.
   - Frame progress in an identity-based way (e.g., becoming calmer, more intentional, more caring, more consistent).
   - If few actions were taken, normalize this gently and still highlight emotional honesty or awareness as meaningful.

IMPORTANT GUIDELINES:
• Never mention what the user did not do.
• Never use guilt-inducing or evaluative language.
• Never give advice or instructions.
• Do not use numbers, percentages, or streaks.
• Keep the tone calm, supportive, and encouraging.
• Keep the response to exactly 2 sentences.
• Focus on effort, awareness, and direction — not performance.`;

const getCheckInTimeOfDay = (now: Date = new Date()): CheckInType => {
  const hour = now.getHours();
  if (hour >= 4 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 17) return 'midday';
  return 'evening';
};

const pad2 = (value: number): string => String(value).padStart(2, '0');

const getDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
};

const parseDateParam = (value: unknown): Date | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parts = value.split('-');
  if (parts.length !== 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const getWeekStartMonday = (date: Date): Date => {
  const base = new Date(date);
  base.setHours(0, 0, 0, 0);
  const day = base.getDay();
  const diffToMonday = (day + 6) % 7;
  base.setDate(base.getDate() - diffToMonday);
  return base;
};

const isDateWithinWeek = (date: Date, weekStart: Date): boolean => {
  const startKey = getDateKey(weekStart);
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  const endKey = getDateKey(end);
  const key = getDateKey(date);
  return key >= startKey && key <= endKey;
};

const getHabitFrequencyForDay = (habit: Habit, dayOfWeek: number): boolean => {
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekly') {
    const weekDays = habit.weekDays ?? [];
    return weekDays.includes(dayOfWeek);
  }
  return false;
};


const getHabitCreatedDateKey = (habit: Habit, fallbackKey: string): string => {
  const createdAtRaw = habit.createdAt;
  const createdAt = new Date(createdAtRaw);
  if (!createdAtRaw || Number.isNaN(createdAt.getTime())) {
    console.log('[Today] Habit has invalid createdAt; using fallback key to avoid leaking into past days', {
      habitId: habit.id,
      createdAt: createdAtRaw,
      fallbackKey,
    });
    return fallbackKey;
  }
  return getDateKey(createdAt);
};

const findMostRecentMissedHabitDate = (
  habit: Habit,
  selectedDate: Date,
  lookbackDays: number,
  fallbackCreatedKey: string
): string | undefined => {
  const createdKey = getHabitCreatedDateKey(habit, fallbackCreatedKey);

  for (let offset = 1; offset <= lookbackDays; offset += 1) {
    const checkDate = new Date(selectedDate);
    checkDate.setDate(selectedDate.getDate() - offset);
    const checkKey = getDateKey(checkDate);

    if (checkKey < createdKey) {
      return undefined;
    }

    const shouldDo = getHabitFrequencyForDay(habit, checkDate.getDay());
    if (!shouldDo) {
      continue;
    }

    const wasCompleted = habit.completedDates.includes(checkKey);
    if (!wasCompleted) {
      return checkKey;
    }
  }

  return undefined;
};

const buildCarryForwardHabits = (
  allHabits: Habit[],
  selectedDate: Date,
  selectedDateKey: string,
  scheduledTodayIds: Set<string>,
  fallbackCreatedKey: string
): HabitWithComputed[] => {
  const lookbackDays = 14;
  const carried: HabitWithComputed[] = [];

  allHabits.forEach(habit => {
    if (scheduledTodayIds.has(habit.id)) {
      return;
    }

    const missedKey = findMostRecentMissedHabitDate(habit, selectedDate, lookbackDays, fallbackCreatedKey);
    if (!missedKey) {
      return;
    }

    const completedToday = habit.completedDates.includes(selectedDateKey);
    const todayValue = habit.trackingData?.[selectedDateKey];

    carried.push({
      ...habit,
      completedToday,
      todayValue,
      carriedFromDateKey: missedKey,
    });
  });

  console.log('[Today] Carry-forward habits computed', {
    selectedDateKey,
    totalHabits: allHabits.length,
    scheduledToday: scheduledTodayIds.size,
    carried: carried.length,
  });

  return carried;
};

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const appState = useAppState();

  const { state, toggleTodo, toggleHabitCompletion, toggleGoalTask, addTodo, calculateXPForLevel, addDailyCheckIn, updateDailyCheckIn } = appState;
  const router = useRouter();

  const currentWeekStart = useMemo(() => getWeekStartMonday(new Date()), []);
  const todayKey = useMemo(() => getDateKey(new Date()), []);

  const selectedDate = useMemo(() => {
    const parsed = parseDateParam(params?.date);
    const fallback = new Date();
    if (!parsed) return fallback;

    if (!isDateWithinWeek(parsed, currentWeekStart)) {
      console.log('[Today] Ignoring out-of-week date param (week navigation disabled)', {
        paramDate: params?.date,
        currentWeekStart: getDateKey(currentWeekStart),
      });
      return fallback;
    }

    return parsed;
  }, [currentWeekStart, params?.date]);

  const selectedDateKey = useMemo(() => getDateKey(selectedDate), [selectedDate]);
  const selectedDayOfWeek = useMemo(() => selectedDate.getDay(), [selectedDate]);
  const isViewingToday = useMemo(() => getDateKey(new Date()) === selectedDateKey, [selectedDateKey]);

  const selectedWeekdayText = useMemo(() => {
    return selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
    });
  }, [selectedDate]);

  const selectedMonthDayText = useMemo(() => {
    return selectedDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });
  }, [selectedDate]);

  const selectedDateHeaderText = useMemo(() => {
    return `${selectedWeekdayText}, ${selectedMonthDayText}`;
  }, [selectedMonthDayText, selectedWeekdayText]);

  const todos = useMemo((): Todo[] => {
    const selectedKey = selectedDateKey;

    return state.todos.filter(t => {
      const createdAt = new Date(t.createdAt);
      const createdKey = Number.isNaN(createdAt.getTime()) ? '' : getDateKey(createdAt);

      if (createdKey && createdKey > selectedKey) {
        return false;
      }

      if (t.completed && t.completedAt) {
        const completedAt = new Date(t.completedAt);
        const completedKey = Number.isNaN(completedAt.getTime()) ? '' : getDateKey(completedAt);
        return completedKey === selectedKey;
      }

      if (!t.completed) {
        return createdKey === selectedKey || (createdKey.length > 0 && createdKey < selectedKey);
      }

      return false;
    });
  }, [selectedDateKey, state.todos]);

  const goalTasks = useMemo(() => {
    const selectedKey = selectedDateKey;

    return state.goalTasks.filter(task => {
      const createdAt = new Date(task.createdAt);
      const createdKey = Number.isNaN(createdAt.getTime()) ? '' : getDateKey(createdAt);

      const dueKey = task.dueDate ?? '';

      if (task.completed) {
        if (!task.completedAt) return false;
        const completedAt = new Date(task.completedAt);
        const completedKey = Number.isNaN(completedAt.getTime()) ? '' : getDateKey(completedAt);
        return completedKey === selectedKey;
      }

      if (createdKey && createdKey > selectedKey) {
        return false;
      }

      if (!dueKey) {
        return createdKey === selectedKey || (createdKey.length > 0 && createdKey < selectedKey);
      }

      return dueKey === selectedKey || (dueKey < selectedKey);
    });
  }, [selectedDateKey, state.goalTasks]);

  const habits = useMemo((): HabitWithComputed[] => {
    const scheduledHabits: HabitWithComputed[] = state.habits
      .filter(habit => {
        const createdKey = getHabitCreatedDateKey(habit, todayKey);
        if (createdKey > selectedDateKey) {
          return false;
        }
        return getHabitFrequencyForDay(habit, selectedDayOfWeek);
      })
      .map(habit => {
        const completedToday = habit.completedDates.includes(selectedDateKey);
        const todayValue = habit.trackingData?.[selectedDateKey];
        return {
          ...habit,
          completedToday,
          todayValue,
        };
      });

    const scheduledIds = new Set<string>(scheduledHabits.map(h => h.id));

    const carried = buildCarryForwardHabits(state.habits, selectedDate, selectedDateKey, scheduledIds, todayKey);

    return [...scheduledHabits, ...carried];
  }, [selectedDate, selectedDateKey, selectedDayOfWeek, state.habits, todayKey]);

  const [newTodoTitle, setNewTodoTitle] = useState('');
  const checkInTimeOfDay: CheckInType = getCheckInTimeOfDay(isViewingToday ? new Date() : selectedDate);
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
    toggleHabitCompletion(id, `${selectedDateKey}T12:00:00.000Z`);
  };

  const handleTaskEdit = (id: string, isGoalTask: boolean) => {
    const type = isGoalTask ? 'goal' : 'todo';
    router.push({
      pathname: '/task-edit' as any,
      params: { id, type },
    });
  };

  const handleEditHabit = (habitId: string) => {
    router.push({ pathname: '/habit-edit' as any, params: { id: habitId } });
  };

  const getSelectedDayCheckIns = () => {
    const morningCheckIn = state.dailyCheckIns.find(c => c.date === selectedDateKey && c.type === 'morning');
    const middayCheckIn = state.dailyCheckIns.find(c => c.date === selectedDateKey && c.type === 'midday');
    const eveningCheckIn = state.dailyCheckIns.find(c => c.date === selectedDateKey && c.type === 'evening');
    return { morningCheckIn, middayCheckIn, eveningCheckIn, dateKey: selectedDateKey };
  };

  const todaysActionsList = useMemo(() => {
    const pieces: string[] = [];

    habits.forEach(h => {
      pieces.push(h.title);
    });

    goalTasks.forEach((t: any) => {
      if (typeof t?.title === 'string' && t.title.trim().length > 0) {
        pieces.push(t.title);
      }
    });

    todos.forEach(t => {
      if (typeof t?.title === 'string' && t.title.trim().length > 0) {
        pieces.push(t.title);
      }
    });

    const unique = Array.from(new Set(pieces.map(p => p.trim()).filter(Boolean)));
    return unique.slice(0, 12);
  }, [habits, goalTasks, todos]);

  const { data: checkInPrompt, isFetching: isCheckInPromptFetching, isError: isCheckInPromptError } = useQuery({
    queryKey: ['daily-checkin-prompt', checkInTimeOfDay, todaysActionsList],
    queryFn: async () => {
      const timeOfDayText = checkInTimeOfDay;
      const actionsText = todaysActionsList.length > 0 ? todaysActionsList.join(', ') : 'None listed';

      console.log('[DailyCheckInPrompt] Generating prompt', { timeOfDayText, actionsCount: todaysActionsList.length });

      const response = await generateText({
        messages: [
          {
            role: 'user',
            content: `${CHECK_IN_PROMPT}\n\nINPUT:\n- Time of day: ${timeOfDayText}\n- Today's actions: ${actionsText}`,
          },
        ],
        temperature: 0.75,
        topP: 0.9,
        frequencyPenalty: 0.3,
        presencePenalty: 0.15,
      });

      const cleaned = response.replace(/^['"\s]+|['"\s]+$/g, '').replace(/\s+/g, ' ').trim();
      if (!cleaned) {
        throw new Error('Empty check-in prompt response');
      }

      return cleaned;
    },
    staleTime: 1000 * 60 * 10,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const checkInPlaceholder = "Write a few words for future you…";

  const isPastDay = useMemo(() => selectedDateKey < todayKey, [selectedDateKey, todayKey]);

  const dailySummaryPayload = useMemo(() => {
    const dayCheckIns = state.dailyCheckIns
      .filter(c => c.date === selectedDateKey)
      .map(c => ({
        type: c.type,
        mood: c.mood,
        reflection: c.reflection ?? '',
      }));

    const dayJournalEntries = state.journalEntries
      .filter(entry => {
        const createdAt = entry.createdAt;
        if (!createdAt) return false;
        const parsed = new Date(createdAt);
        if (Number.isNaN(parsed.getTime())) return false;
        return getDateKey(parsed) === selectedDateKey;
      })
      .map(entry => ({
        mood: entry.mood ?? null,
        content: entry.content,
      }));

    const dayHabits = state.habits
      .filter(h => h.completedDates.includes(selectedDateKey))
      .map(h => h.title);

    const dayTodos = state.todos
      .filter(t => {
        const completedAt = t.completedAt;
        if (!t.completed || !completedAt) return false;
        const parsed = new Date(completedAt);
        if (Number.isNaN(parsed.getTime())) return false;
        return getDateKey(parsed) === selectedDateKey;
      })
      .map(t => t.title);

    const dayGoalTasks = state.goalTasks
      .filter(t => {
        const completedAt = t.completedAt;
        if (!t.completed || !completedAt) return false;
        const parsed = new Date(completedAt);
        if (Number.isNaN(parsed.getTime())) return false;
        return getDateKey(parsed) === selectedDateKey;
      })
      .map(t => t.title);

    const dayGoalsContext = state.goals
      .filter(g => g.status !== 'archived')
      .slice(0, 4)
      .map(g => ({ title: g.title, why: g.why ?? '' }));

    return {
      dateKey: selectedDateKey,
      checkIns: dayCheckIns,
      journalEntries: dayJournalEntries,
      completedHabits: dayHabits,
      completedTodos: dayTodos,
      completedGoalTasks: dayGoalTasks,
      vision: state.vision?.text ?? '',
      goals: dayGoalsContext,
    };
  }, [selectedDateKey, state.dailyCheckIns, state.goalTasks, state.goals, state.habits, state.journalEntries, state.todos, state.vision?.text]);

  const { data: dailySummary, isFetching: isDailySummaryFetching, isError: isDailySummaryError } = useQuery({
    queryKey: ['daily-summary', selectedDateKey, dailySummaryPayload],
    queryFn: async () => {
      console.log('[DailySummary] Generating daily summary', { selectedDateKey, hasVision: Boolean(dailySummaryPayload.vision) });

      const payloadText = JSON.stringify(dailySummaryPayload, null, 2);

      const response = await generateText({
        messages: [
          {
            role: 'user',
            content: `${DAILY_SUMMARY_PROMPT}\n\nDay context (JSON):\n${payloadText}`,
          },
        ],
        temperature: 0.55,
        topP: 0.9,
        frequencyPenalty: 0.2,
        presencePenalty: 0.1,
      });

      const cleaned = response.replace(/^['"\s]+|['"\s]+$/g, '').replace(/\s+/g, ' ').trim();
      if (!cleaned) {
        throw new Error('Empty daily summary response');
      }

      const sentenceParts = cleaned
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(Boolean);

      const finalText = sentenceParts.slice(0, 2).join(' ').trim();

      console.log('[DailySummary] Summary ready', { sentenceCount: sentenceParts.length });
      return finalText;
    },
    enabled: isPastDay,
    staleTime: 1000 * 60 * 60 * 24 * 14,
    gcTime: 1000 * 60 * 60 * 24 * 21,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const todayDateKey = useMemo(() => selectedDateKey, [selectedDateKey]);

  const { data: dailyQuote, isFetching: isDailyQuoteFetching, isError: isDailyQuoteError } = useQuery({
    queryKey: ['daily-quote', todayDateKey],
    queryFn: async () => {
      console.log('[DailyQuote] Generating daily quote', { todayDateKey });
      const response = await generateText({
        messages: [
          {
            role: 'user',
            content: `${DAILY_QUOTE_PROMPT}\n\nDay: ${todayDateKey}`,
          },
        ],
        temperature: 0.85,
        topP: 0.95,
        frequencyPenalty: 0.35,
        presencePenalty: 0.25,
      });

      const cleaned = response.replace(/^['"\s]+|['"\s]+$/g, '').replace(/\s+/g, ' ').trim();
      if (!cleaned) {
        throw new Error('Empty daily quote response');
      }

      return cleaned;
    },
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const microCopyText = useMemo(() => {
    if (isDailyQuoteFetching && !dailyQuote) return '…';
    if (dailyQuote) return dailyQuote;
    if (isDailyQuoteError) return 'Today is a fresh chance for a small win.';
    return 'Today is a fresh chance for a small win.';
  }, [dailyQuote, isDailyQuoteError, isDailyQuoteFetching]);


  const checkInSubtext = useMemo(() => {
    if (isCheckInPromptFetching && !checkInPrompt) return '…';
    if (checkInPrompt) return checkInPrompt;
    if (isCheckInPromptError) return 'How are you feeling right now?';
    return 'How are you feeling right now?';
  }, [checkInPrompt, isCheckInPromptError, isCheckInPromptFetching]);

  const getMoodEvaluation = () => {
    const { morningCheckIn, eveningCheckIn } = getSelectedDayCheckIns();
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

    const checkInType = checkInTimeOfDay;
    const { dateKey } = getSelectedDayCheckIns();
    
    const { morningCheckIn, middayCheckIn, eveningCheckIn } = getSelectedDayCheckIns();
    const currentCheckIn = checkInType === 'morning' ? morningCheckIn : checkInType === 'midday' ? middayCheckIn : eveningCheckIn;

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
        date: dateKey,
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
    const { morningCheckIn, middayCheckIn, eveningCheckIn } = getSelectedDayCheckIns();
    const currentCheckIn = checkInTimeOfDay === 'morning' ? morningCheckIn : checkInTimeOfDay === 'midday' ? middayCheckIn : eveningCheckIn;
    
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
    const moodMap: Record<MoodType, string> = {
      great: '😃',
      fine: '😊',
      neutral: '😐',
      stressed: '😖',
      low: '😢',
    };
    return moodMap[mood];
  };

  const formatThoughtTime = useCallback((iso: string): string => {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }, []);

  type TodayThoughtItem = {
    id: string;
    createdAt: string;
    mood?: MoodType;
    text: string;
    kind: 'journal' | 'checkin';
  };

  const todaysThoughts = useMemo(() => {
    const journalThoughts: TodayThoughtItem[] = state.journalEntries
      .filter(entry => {
        const createdAt = entry.createdAt;
        if (!createdAt) return false;
        const parsed = new Date(createdAt);
        if (Number.isNaN(parsed.getTime())) return false;
        return getDateKey(parsed) === selectedDateKey;
      })
      .map(entry => ({
        id: `journal-${entry.id}`,
        createdAt: entry.createdAt,
        mood: entry.mood,
        text: entry.content,
        kind: 'journal',
      }));

    const checkInThoughts: TodayThoughtItem[] = state.dailyCheckIns
      .filter(c => c.date === selectedDateKey)
      .map(c => ({
        id: `checkin-${c.id}`,
        createdAt: c.createdAt,
        mood: c.mood,
        text: c.reflection ?? '',
        kind: 'checkin',
      }));

    const merged = [...journalThoughts, ...checkInThoughts].filter(item => item.text.trim().length > 0);
    merged.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });

    console.log('[Today] Today\'s thoughts computed', {
      selectedDateKey,
      journalCount: journalThoughts.length,
      checkInCount: checkInThoughts.length,
      total: merged.length,
    });

    return merged;
  }, [selectedDateKey, state.dailyCheckIns, state.journalEntries]);

  const getSortedActions = (
    habits: HabitWithComputed[],
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

    habits.forEach((habit: HabitWithComputed) => {
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
              {isViewingToday ? (
                <>
                  <Text style={styles.headerTitle} testID="today-header-title">Today</Text>
                  <Text style={styles.headerSubtitle} testID="today-header-subtitle">
                    {selectedDateHeaderText}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.headerTitle} testID="today-header-selected-weekday">
                    {selectedWeekdayText}
                  </Text>
                  <Text style={styles.headerSubtitle} testID="today-header-selected-monthday">
                    {selectedMonthDayText}
                  </Text>
                </>
              )}
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

        <WeekPreview
          isCompletedToday={isEverythingCompletedToday()}
          selectedDateKey={selectedDateKey}
          weekStartDate={currentWeekStart}
          onSelectDateKey={(dateKey) => {
            console.log('[Today] WeekPreview select day', { dateKey });
            router.setParams({ date: dateKey } as any);
          }}
        />

        {isPastDay && (
          <View style={styles.dailySummaryWrap} testID="daily-summary-wrap">
            <Text style={styles.checkInTitleOutside}>SUMMARY</Text>
            <View style={styles.dailySummaryCard} testID="daily-summary-card">
              <View style={styles.dailySummaryHeader}>
                <View style={styles.dailySummaryIconWrap}>
                  <Sparkles size={16} color={Colors.tealSoft} />
                </View>
                <Text style={styles.dailySummaryDate} testID="daily-summary-date">{selectedDateHeaderText}</Text>
              </View>

              {isDailySummaryFetching && !dailySummary ? (
                <View style={styles.dailySummaryLoading} testID="daily-summary-loading">
                  <ActivityIndicator size="small" color={Colors.tealSoft} />
                  <Text style={styles.dailySummaryLoadingText}>Pulling your day together…</Text>
                </View>
              ) : (
                <Text style={styles.dailySummaryText} testID="daily-summary-text">
                  {dailySummary ??
                    (isDailySummaryError
                      ? 'Today held a real mix of moments, and you showed up with honesty. Even noticing your experience is part of who you’re becoming.'
                      : '…')}
                </Text>
              )}
            </View>
          </View>
        )}

        {!isPastDay && <VisionEssenceCard state={state} />}

        {!isPastDay && <Text style={styles.checkInTitleOutside}>DAILY CHECK-IN</Text>}
        {!isPastDay && <View style={styles.journalSection}>
          {(() => {
            const { morningCheckIn, middayCheckIn, eveningCheckIn } = getSelectedDayCheckIns();
            const currentCheckIn = checkInTimeOfDay === 'morning'
              ? morningCheckIn
              : checkInTimeOfDay === 'midday'
                ? middayCheckIn
                : eveningCheckIn;
            const showCheckInForm = !currentCheckIn || isEditingCheckIn;
            const evaluation = getMoodEvaluation();

            return (
              <>
                <Text style={styles.checkInSubtext} testID="daily-checkin-prompt-text">{checkInSubtext}</Text>

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
                      placeholder={checkInPlaceholder}
                      placeholderTextColor={Colors.textSecondary}
                      multiline
                      numberOfLines={2}
                      value={checkInReflection}
                      onChangeText={setCheckInReflection}
                      textAlignVertical="top"
                      testID="daily-checkin-input"
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
                        <TouchableOpacity style={styles.editCheckInButton} onPress={handleEditCheckIn} testID="daily-checkin-edit-button">
                          <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {checkInTimeOfDay === 'evening' && morningCheckIn && eveningCheckIn && evaluation && (
                      <View style={styles.evaluationCard} testID="daily-checkin-evaluation-card">
                        <Text style={styles.evaluationText} testID="daily-checkin-evaluation-text">{evaluation}</Text>
                      </View>
                    )}
                  </>
                )}
              </>
            );
          })()}
        </View>}

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
                    const habit = item.data as HabitWithComputed;
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
                        const habit = item.data as HabitWithComputed;
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

        <View style={styles.microCopyCard} testID="daily-quote-card">
          <View style={styles.microCopyRow}>
            <View style={styles.microCopyIconWrap}>
              <Quote size={18} color={Colors.textSecondary} />
            </View>
            <Text style={styles.microCopyText} testID="daily-quote-text">{microCopyText}</Text>
          </View>
        </View>

        <Text style={styles.todaysThoughtsTitle} testID="todays-thoughts-title">TODAY’S THOUGHTS</Text>
        <View style={styles.todaysThoughtsCard} testID="todays-thoughts-card">
          {todaysThoughts.length === 0 ? (
            <View style={styles.todaysThoughtsEmpty} testID="todays-thoughts-empty">
              <Text style={styles.todaysThoughtsEmptyText}>No thoughts saved for this day yet.</Text>
            </View>
          ) : (
            todaysThoughts.map((item, index) => {
              const moodEmoji = item.mood ? getMoodEmoji(item.mood) : '📝';
              return (
                <View key={item.id} testID={`todays-thoughts-item-${item.id}`}>
                  <View style={styles.todaysThoughtsRow}>
                    <Text style={styles.todaysThoughtsTime} testID={`todays-thoughts-item-time-${item.id}`}>
                      {formatThoughtTime(item.createdAt)}
                    </Text>
                    <Text style={styles.todaysThoughtsEmoji} testID={`todays-thoughts-item-emoji-${item.id}`}>{moodEmoji}</Text>
                    <Text style={styles.todaysThoughtsText} testID={`todays-thoughts-item-text-${item.id}`}>
                      {item.text}
                    </Text>
                  </View>
                  {index < todaysThoughts.length - 1 && <View style={styles.todaysThoughtsDivider} />}
                </View>
              );
            })
          )}
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
              <Text style={[styles.actionTagText, isHabit ? { color: '#AF9BFF' } : { color: '#4A9DFF' }]}>{isHabit ? 'Habit' : 'Task'}</Text>
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

function WeekPreview({
  isCompletedToday,
  selectedDateKey,
  weekStartDate,
  onSelectDateKey,
}: {
  isCompletedToday: boolean;
  selectedDateKey: string;
  weekStartDate: Date;
  onSelectDateKey: (dateKey: string) => void;
}) {
  const weekStart = useMemo(() => {
    return getWeekStartMonday(weekStartDate);
  }, [weekStartDate]);

  const todayKey = useMemo(() => getDateKey(new Date()), []);

  const days = useMemo(() => {
    const list: { dateKey: string; isToday: boolean; isSelected: boolean; dayName: string; dayNum: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateKey = getDateKey(date);
      list.push({
        dateKey,
        isToday: dateKey === todayKey,
        isSelected: dateKey === selectedDateKey,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: date.getDate(),
      });
    }
    return list;
  }, [selectedDateKey, todayKey, weekStart]);

  return (
    <View style={styles.weekPreview}>
      {days.map((day) => (
        <TouchableOpacity
          key={day.dateKey}
          style={[styles.dayItem, day.isSelected && styles.dayItemToday]}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            onSelectDateKey(day.dateKey);
          }}
          activeOpacity={0.85}
          testID={`week-preview-day-${day.dateKey}`}
        >
          <Text style={[styles.dayName, day.isSelected && styles.dayNameToday]}>{day.dayName}</Text>
          <View style={[styles.dayCircle, day.isSelected && styles.dayCircleToday]}>
            {day.isToday && isCompletedToday ? (
              <Ionicons name="checkmark-circle-outline" size={20} color={Colors.primary} />
            ) : (
              <Text style={[styles.dayNum, day.isSelected && styles.dayNumToday]}>{day.dayNum}</Text>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

type NorthStarQueryResult =
  | { kind: 'ok'; text: string }
  | { kind: 'incomplete' }
  | { kind: 'technical' };

const VISION_PROMPT = `You are Journify’s North Star Assistant.

Your task is to generate a short “North Star” statement based on the user’s vision statement.

The North Star should:
• Capture the core essence of who the user wants to become or the life they want to live
• Reuse the user’s original words and phrasing as much as possible
• Avoid heavy paraphrasing or adding new ideas
• Be extremely concise (ideally 8–14 words)
• Feel personal, grounded, and identity-based
• Read like a gentle reminder or anchor, not a goal or instruction

IMPORTANT GUIDELINES:
• Do NOT introduce new concepts not present in the original vision
• Do NOT sound motivational or generic
• Do NOT give advice or direction
• Keep language simple and natural
• If the vision is long, extract and condense rather than rewrite
• If the vision is unclear, choose the clearest recurring theme and reflect it back

Start with "I'm becoming..." or "I'm growing into..." Or "I'm..."`;

function VisionEssenceCard({ state }: { state: AppState }) {
  const router = useRouter();
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
  const visionText = state.vision?.text?.trim() ?? '';
  const visionWordCount = useMemo(() => (visionText ? visionText.split(/\s+/).filter(Boolean).length : 0), [visionText]);

  const hasVision = visionText.length > 0;

  const hasInputs = Boolean(
    hasVision ||
    prioritizedGoals.length > 0 ||
    lifeAreas.length > 0 ||
    interests.length > 0
  );

  const contextDetails = useMemo(() => {
    return visionText ? `Vision statement: ${visionText}` : '';
  }, [visionText]);

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

  const { data, isFetching, isRefetching } = useQuery({
    queryKey: ['vision-essence', queryKeyPayload, contextDetails],
    queryFn: async (): Promise<NorthStarQueryResult> => {
      console.log('[VisionEssenceCard] Generating new vision essence');
      try {
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
          console.warn('[VisionEssenceCard] Empty response from generator');
          return { kind: 'incomplete' };
        }

        console.log('[VisionEssenceCard] Vision essence ready');
        return { kind: 'ok', text: cleaned };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[VisionEssenceCard] Generator error', { message });

        const lower = message.toLowerCase();
        const looksTechnical =
          lower.includes('network') ||
          lower.includes('failed to fetch') ||
          lower.includes('timeout') ||
          lower.includes('tempor') ||
          lower.includes('502') ||
          lower.includes('503') ||
          lower.includes('504');

        return looksTechnical ? { kind: 'technical' } : { kind: 'incomplete' };
      }
    },
    enabled: hasVision && visionWordCount >= 8 && hasInputs,
    staleTime: 1000 * 60 * 30,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const handleOpenVisionEditor = useCallback(() => {
    console.log('[VisionEssenceCard] Opening vision editor from Today');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({ pathname: '/vision-editor' as any, params: { returnTo: '/(tabs)/today' } });
  }, [router]);

  const showSpinner = hasVision && visionWordCount >= 8 && !data && (isFetching || isRefetching);

  const fallbackText = !hasVision
    ? 'Create your vision statement to view your north star.'
    : visionWordCount < 8
      ? 'Refine your vision statement to generate a north star.'
      : data?.kind === 'technical'
        ? 'Unable to generate north star statement, something is wrong on our end.'
        : data?.kind === 'incomplete'
          ? 'Refine your vision statement to generate a north star.'
          : undefined;

  const displayText = data?.kind === 'ok' ? data.text : fallbackText;

  return (
    <View>
      <Text style={styles.checkInTitleOutside}>YOUR NORTH STAR</Text>
      <TouchableOpacity
        onPress={handleOpenVisionEditor}
        activeOpacity={0.9}
        style={styles.visionCard}
        testID="north-star-card"
      >
        <View style={styles.visionCardBody}>
          {showSpinner ? (
            <ActivityIndicator size="small" color={Colors.tealSoft} />
          ) : (
            <Text
              style={data?.kind === 'ok' ? styles.visionCardText : styles.visionCardErrorText}
              testID={data?.kind === 'ok' ? 'north-star-text' : 'north-star-empty-text'}
            >
              {displayText}
            </Text>
          )}
        </View>
      </TouchableOpacity>
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
    paddingVertical: 24,
    paddingHorizontal: 18,
  },
  dailySummaryWrap: {
    marginBottom: 6,
  },
  dailySummaryCard: {
    marginHorizontal: 14,
    marginBottom: 16,
    backgroundColor: 'rgba(8, 32, 41, 0.9)',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  dailySummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  dailySummaryIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(107, 230, 218, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailySummaryDate: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  dailySummaryLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  dailySummaryLoadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dailySummaryText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    fontWeight: '500',
  },
  microCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  microCopyIconWrap: {
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  microCopyText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    textAlign: 'left',
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
    minHeight: 84,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visionCardText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  visionCardErrorText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
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
  todaysThoughtsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 14,
  },
  todaysThoughtsCard: {
    marginHorizontal: 14,
    marginBottom: 18,
    backgroundColor: Colors.glassBg,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  todaysThoughtsEmpty: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  todaysThoughtsEmptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  todaysThoughtsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  todaysThoughtsTime: {
    width: 64,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  todaysThoughtsEmoji: {
    width: 28,
    fontSize: 18,
    textAlign: 'center',
    marginTop: -1,
  },
  todaysThoughtsText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    fontWeight: '500',
  },
  todaysThoughtsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});
