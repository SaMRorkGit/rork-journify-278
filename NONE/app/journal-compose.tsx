import { Stack, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, RefreshCcw, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/colors';
import { useAppState } from '../contexts/AppStateContext';
import { useToast } from '../contexts/ToastContext';
import type { JournalEntry, MoodType, ReflectionInsightsData } from '../types';
import { generateText } from '@rork-ai/toolkit-sdk';

const moodOptions: { value: MoodType; emoji: string; label: string }[] = [
  { value: 'great', emoji: '😃', label: 'Great' },
  { value: 'fine', emoji: '😊', label: 'Fine' },
  { value: 'neutral', emoji: '😐', label: 'Neutral' },
  { value: 'stressed', emoji: '😖', label: 'Stressed' },
  { value: 'low', emoji: '😢', label: 'Sad' },
];

const journifyPromptInstruction = `You are Journify’s Prompt Generator.
Your job is to create short, simple, reflective prompts that help users gain clarity, reflect, understand themselves better and spark some reflection ideas. Generate personalized prompts based on their interests/hobbies, previous journal reflections written, current or completed goals/habits, life vision, aspirations, and progress insights.
REQUIREMENTS:
• Each prompt must be one sentence.
• Keep it as short as possible (max 8–12 words).
• Every prompt MUST start with: What, When, Where, Who, or How.
• Prompts should feel gentle, warm, and easy to answer.
• No long explanations, no follow-ups, no multi-part questions.
• Avoid anything that feels therapeutic, clinical, or intrusive.
• Provide variety in tone and focus (identity, feelings, actions, values, routines, goals).
• Ensure each prompt is distinctly different from the others.
• After generating each prompt, internally check similarity to previous prompts and replace any that feel repetitive.
• Vary the topic, structure, and emotional angle while randomly mixing themes like identity, feelings, routines, values, choices, relationships, growth, clarity, habits, and small wins.
• Avoid repetitive phrasing or similar meaning.
• Prompt rotation order must always follow this loop and repeat after #7 without resetting:
  1) Focus on the user’s current active goals.
  2) Focus on the user’s interests or hobbies from onboarding (if available).
  3) Offer a generic open reflection prompt.
  4) Focus on the user’s current habits or routines.
  5) Highlight actions the user has taken recently (today or earlier).
  6) Reconnect the user with their vision statement or future self (if available).
  7) Use EXACTLY one prompt from the approved preset list below and output it verbatim.
Preset Prompt Pool:
- What made your body feel good today?
- How did you take care of yourself today?
- When did you feel most energized recently?
- What small choice improved your well-being today?
- How do you want to feel in your body this week?
- What helps you feel grounded in stressful moments?
- What emotion needs your attention today?
- How did you speak to yourself internally today?
- What helped you feel calm recently?
- When did you feel proud of yourself last?
- What thought or belief is lifting you up right now?
- How would you describe your inner voice today?
- Who made you feel supported this week?
- How did you show care to someone today?
- What connection felt meaningful recently?
- Who do you want to be closer to, and why?
- How can you show up more fully in your relationships?
- When did you feel genuinely seen or appreciated?
- What work made you feel engaged today?
- How did you move toward your long-term goals this week?
- When did you feel most confident at work?
- What skill do you want to grow next?
- How can you make tomorrow feel more purposeful?
- What small win at work felt meaningful recently?
- What financial choice helped you feel more secure today?
- How do you want your financial future to feel?
- What spending habits support the life you want?
- What mattered most to you today?
- How did today shape your mood?
- What felt like a small win today?
- What moment made you pause and reflect?
- How did you show kindness to yourself today?
- What brought you a sense of clarity recently?
- What are you looking forward to this week?
- How can tomorrow feel a little lighter?
- What are you grateful for in this moment?`;

const PRESET_PROMPT_POOL = [
  'What made your body feel good today?',
  'How did you take care of yourself today?',
  'When did you feel most energized recently?',
  'What small choice improved your well-being today?',
  'How do you want to feel in your body this week?',
  'What helps you feel grounded in stressful moments?',
  'What emotion needs your attention today?',
  'How did you speak to yourself internally today?',
  'What helped you feel calm recently?',
  'When did you feel proud of yourself last?',
  'What thought or belief is lifting you up right now?',
  'How would you describe your inner voice today?',
  'Who made you feel supported this week?',
  'How did you show care to someone today?',
  'What connection felt meaningful recently?',
  'Who do you want to be closer to, and why?',
  'How can you show up more fully in your relationships?',
  'When did you feel genuinely seen or appreciated?',
  'What work made you feel engaged today?',
  'How did you move toward your long-term goals this week?',
  'When did you feel most confident at work?',
  'What skill do you want to grow next?',
  'How can you make tomorrow feel more purposeful?',
  'What small win at work felt meaningful recently?',
  'What financial choice helped you feel more secure today?',
  'How do you want your financial future to feel?',
  'What spending habits support the life you want?',
  'What mattered most to you today?',
  'How did today shape your mood?',
  'What felt like a small win today?',
  'What moment made you pause and reflect?',
  'How did you show kindness to yourself today?',
  'What brought you a sense of clarity recently?',
  'What are you looking forward to this week?',
  'How can tomorrow feel a little lighter?',
  'What are you grateful for in this moment?',
] as const;

const PROMPT_SEQUENCE_CONFIG = [
  {
    key: 'goals',
    label: 'Active Goals',
    instruction: 'Center the prompt on the user’s current active goals, progress, or needed adjustments. If no goals exist, invite them to define one.',
    isPreset: false,
  },
  {
    key: 'interests',
    label: 'Interests & Hobbies',
    instruction: 'Tie the prompt to the user’s interests or hobbies gathered during onboarding. If none are available, invite curiosity about activities that light them up.',
    isPreset: false,
  },
  {
    key: 'generic',
    label: 'General Reflection',
    instruction: 'Offer an open-ended reflective question that fits today broadly while staying gentle and concise.',
    isPreset: false,
  },
  {
    key: 'habits',
    label: 'Current Habits',
    instruction: 'Focus on daily or weekly habits. Encourage noticing consistency, challenges, or shifts in routines. If no habits exist, prompt them to imagine a supportive routine.',
    isPreset: false,
  },
  {
    key: 'actions',
    label: 'Recent Actions',
    instruction: 'Spotlight actions taken recently (today or before) and invite reflection on their impact or meaning.',
    isPreset: false,
  },
  {
    key: 'vision',
    label: 'Vision Statement',
    instruction: 'Reconnect the user with their vision statement or future self. If unavailable, invite them to imagine how they want life to feel.',
    isPreset: false,
  },
  {
    key: 'preset',
    label: 'Preset Gentle Prompts',
    instruction: 'Select EXACTLY one prompt from the approved preset list and output it verbatim without any additional words or punctuation.',
    isPreset: true,
  },
] as const;

type PromptSequenceKey = typeof PROMPT_SEQUENCE_CONFIG[number]['key'];

interface RequestPromptVariables {
  userDraft: string;
  history: string[];
  step: number;
}

const PROMPT_HISTORY_LIMIT = 7;
const MAX_PROMPT_ATTEMPTS = 3;

const tokenizePrompt = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const EMPTY_INSIGHTS: ReflectionInsightsData = {
  life_areas: [],
  goal_alignment: [],
  emotions: [],
  wins: [],
  energizers: [],
  drainers: [],
};

const isPromptTooSimilar = (candidate: string, history: string[]): boolean => {
  if (!candidate.trim() || history.length === 0) {
    return false;
  }
  const candidateWords = tokenizePrompt(candidate);
  if (candidateWords.length === 0) {
    return false;
  }
  const candidateLead = candidateWords.slice(0, 3).join(' ');
  const candidateSet = new Set(candidateWords);
  return history.some(previous => {
    const previousWords = tokenizePrompt(previous);
    if (previousWords.length === 0) {
      return false;
    }
    const previousLead = previousWords.slice(0, 3).join(' ');
    const previousSet = new Set(previousWords);
    const intersection = [...candidateSet].filter(word => previousSet.has(word)).length;
    const unionSize = new Set([...candidateSet, ...previousSet]).size || 1;
    const similarity = intersection / unionSize;
    return similarity >= 0.6 || (candidateLead !== '' && candidateLead === previousLead);
  });
};

const isNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const extractFirstJsonObject = (text: string): string | null => {
  let depth = 0;
  let start = -1;
  let inString = false;
  let escapeNext = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (start !== -1) {
      if (escapeNext) {
        escapeNext = false;
      } else if (char === '\\') {
        escapeNext = true;
      } else if (char === '"') {
        inString = !inString;
      } else if (!inString) {
        if (char === '{') {
          depth += 1;
        } else if (char === '}') {
          depth -= 1;
          if (depth === 0 && start !== -1) {
            return text.slice(start, i + 1);
          }
        }
      }
    } else if (char === '{') {
      start = i;
      depth = 1;
    }
  }
  return null;
};

const normalizeInsights = (insights?: Partial<ReflectionInsightsData>): ReflectionInsightsData => ({
  life_areas: Array.isArray(insights?.life_areas) ? insights?.life_areas : [],
  goal_alignment: Array.isArray(insights?.goal_alignment) ? insights?.goal_alignment : [],
  emotions: Array.isArray(insights?.emotions) ? insights?.emotions : [],
  wins: Array.isArray(insights?.wins) ? insights?.wins : [],
  energizers: Array.isArray(insights?.energizers) ? insights?.energizers : [],
  drainers: Array.isArray(insights?.drainers) ? insights?.drainers : [],
});

const REFLECTION_INSIGHTS_GUIDANCE = `⭐ SYSTEM / INSTRUCTION PROMPT
You are Journify’s reflection analysis assistant.
Your job is to gently extract meaningful insights for each journal entry. Display each section below the extracted habits/task/goals section in the Reflection Insights screen.

Analyze the text and extract only the following 5 categories:
Life Areas Mentioned
Goal Alignment
Emotional Themes
Wins & Accomplishments
Energizers & Drainers

Be supportive, neutral, and non-judgmental.
Do NOT give advice or opinions.
Keep outputs concise.

Action Extraction Logic
You are an AI assistant that classifies a user’s action or statement into one of three categories: Goal, Task, or Habit.
Use the following rules:
1. Classify as a Goal if:
The action is big, multi-step, or long-term.
It cannot be completed in a single sitting.
It requires planning, multiple tasks, or milestones to achieve.
Examples of goals: “Start a business,” “Write a book,” “Get healthier,” “Launch my website.”

2. Classify as a Task if:
The action can be completed in one sitting or with one action.
It does not require multiple steps.
It is short-term and specific.
Examples of tasks: “Email my accountant,” “Buy groceries,” “Update my website banner.”

3. Classify as a Habit if:
The action is something the user wants to do repeatedly or regularly (daily, weekly, etc.).
It is a behavior or practice rather than a one-time action.
Examples of habits: “Drink more water,” “Meditate daily,” “Go to the gym 3 times a week.”

4. Naming rules:
Don't use any conjunction words in the task, habit, or goal names such as “so that,” “because,” or “in order.” Use concise standalone phrases like “Improve the app” or “Be healthier.”

⭐ DEFINITIONS (for the model)
1. Life Areas Mentioned
Identify which of these life areas are relevant in the journal:
Health (Physical & Mental well-being)
Growth
Career / Work
Relationships
Finance
Return only the areas actually mentioned (explicitly or implicitly).

2. Goal Alignment
Detect whether any part of the journal relates to the user’s active goals.
Look for:
• phrases that match or support a goal
• actions, thoughts, or reflections connected to progress
• identity statements related to their goals
Only include alignment signals that clearly connect to the user’s active goals (provided in the goal alignment context). If there are no active goals, leave "goal_alignment" as an empty array; the UI will display “You don't currently have an active goal.”

3. Emotional Themes
Extract the emotions expressed in the journal.
Prefer emotional categories such as: stressed, calm, tired, anxious, overwhelmed, grateful, hopeful, proud, sad, frustrated.
Return the primary emotions only.

4. Wins & Accomplishments
Identify any positive actions, breakthroughs, or meaningful moments.
Examples:
taking a walk
finishing a task
choosing rest
having a meaningful connection
showing self-kindness
pushing myself to complete a workout even though I’m drained
Return short descriptions.

5. Energizers & Drainers
Identify what lifted the user’s energy (energizers) and what lowered it (drainers).
Examples:
Energizers: connection, sunlight, movement, rest
Drainers: stress, pressure, conflict, overthinking
Return separate lists for energizers vs. drainers.

Return everything in JSON format:
{
  "tasks": [],
  "habits": [],
  "goals": [],
  "insights": {
    "life_areas": [],
    "goal_alignment": [],
    "emotions": [],
    "wins": [],
    "energizers": [],
    "drainers": []
  }
}
If a category is empty, return an empty array. Do not include commentary or formatting outside the JSON.`;

export default function JournalComposeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, addJournalEntry } = useAppState();
  const { showToast } = useToast();
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [entryText, setEntryText] = useState<string>('');
  const [promptText, setPromptText] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [promptSequenceStep, setPromptSequenceStep] = useState<number>(0);

  const trimmedText = entryText.trim();

  const activeGoals = useMemo(
    () => state.goals.filter(goal => !goal.completedAt && goal.status !== 'archived'),
    [state.goals]
  );
  const activeGoalTitles = useMemo(
    () => activeGoals.map(goal => goal.title).filter(isNonEmptyString),
    [activeGoals]
  );
  const habitTitles = useMemo(
    () => state.habits.map(habit => habit.title).filter(isNonEmptyString),
    [state.habits]
  );

  const goalAlignmentDirective = useMemo(() => {
    if (activeGoalTitles.length === 0) {
      return 'The user currently has no active goals. Leave "goal_alignment" as an empty array and do not infer alignment.';
    }
    return `Active goals: ${activeGoalTitles.join(', ')}. Only include entries in "goal_alignment" if they clearly map to these goals.`;
  }, [activeGoalTitles]);
  const interestList = useMemo(
    () => (state.userProfile?.interests ?? []).filter(isNonEmptyString),
    [state.userProfile]
  );
  const visionText = useMemo(() => state.vision?.text ?? '', [state.vision]);
  const recentActionHighlights = useMemo(() => {
    const completedTodos = [...state.todos]
      .filter(todo => todo.completed || Boolean(todo.completedAt))
      .sort(
        (a, b) =>
          new Date(b.completedAt ?? b.createdAt).getTime() -
          new Date(a.completedAt ?? a.createdAt).getTime()
      )
      .slice(0, 3)
      .map(todo => `Task "${todo.title}"`);

    const completedGoalTasks = [...state.goalTasks]
      .filter(task => task.completed || Boolean(task.completedAt))
      .sort(
        (a, b) =>
          new Date(b.completedAt ?? b.createdAt).getTime() -
          new Date(a.completedAt ?? a.createdAt).getTime()
      )
      .slice(0, 2)
      .map(task => `Goal step "${task.title}"`);

    const habitMoments = state.habits
      .map(habit => {
        if (!habit.completedDates.length) {
          return null;
        }
        const lastCompletion = habit.completedDates[habit.completedDates.length - 1];
        if (!lastCompletion) {
          return null;
        }
        return `${habit.title} on ${lastCompletion}`;
      })
      .filter((value): value is string => Boolean(value))
      .slice(0, 2);

    const parts: string[] = [];
    if (completedTodos.length) {
      parts.push(`Completed tasks: ${completedTodos.join(', ')}`);
    }
    if (completedGoalTasks.length) {
      parts.push(`Goal actions: ${completedGoalTasks.join(', ')}`);
    }
    if (habitMoments.length) {
      parts.push(`Habit moments: ${habitMoments.join(', ')}`);
    }
    return parts.join(' | ') || 'No recorded actions yet; invite the user to notice any small step they took.';
  }, [state.goalTasks, state.habits, state.todos]);

  const summarizedContext = useMemo(() => {
    const contextParts: string[] = [];
    if (state.userProfile?.interests?.length) {
      contextParts.push(`Interests: ${state.userProfile.interests.join(', ')}`);
    }
    if (state.habits.length) {
      const habits = state.habits.slice(0, 3).map(habit => habit.title).join(', ');
      contextParts.push(`Habits: ${habits}`);
    }
    if (state.goals.length) {
      const goals = state.goals.slice(0, 3).map(goal => goal.title).join(', ');
      contextParts.push(`Goals: ${goals}`);
    }
    if (state.vision?.text) {
      contextParts.push(`Vision: ${state.vision.text}`);
    }
    if (state.aspirations.length) {
      const aspirations = state.aspirations.slice(0, 2).map(a => a.description).join(' | ');
      contextParts.push(`Aspirations: ${aspirations}`);
    }
    if (state.journalEntries.length) {
      const recentEntry = state.journalEntries[0]?.content ?? '';
      if (recentEntry) {
        contextParts.push(`Recent reflection: ${recentEntry.slice(0, 180)}`);
      }
    }
    if (state.dailyCheckIns.length) {
      const latestCheckIn = state.dailyCheckIns[0];
      if (latestCheckIn?.reflection) {
        contextParts.push(`Latest check-in: ${latestCheckIn.reflection.slice(0, 140)}`);
      }
    }
    return contextParts.join('\n') || 'No additional context available.';
  }, [state]);

  const getThemeContext = useCallback(
    (key: PromptSequenceKey) => {
      switch (key) {
        case 'goals':
          return activeGoalTitles.length
            ? `Active goals: ${activeGoalTitles.join(', ')}`
            : 'Active goals are not defined yet. Encourage the user to name or imagine one.';
        case 'habits':
          return habitTitles.length
            ? `Habits in focus: ${habitTitles.join(', ')}`
            : 'Habits are not set up yet. Invite the user to consider a supportive routine.';
        case 'interests':
          return interestList.length
            ? `Interests and hobbies: ${interestList.join(', ')}`
            : 'Interests from onboarding are unavailable. Invite curiosity about joyful activities.';
        case 'actions':
          return recentActionHighlights;
        case 'vision':
          return visionText
            ? `Vision statement: ${visionText}`
            : 'Vision statement not provided. Encourage imagining their future self and desired feelings.';
        case 'generic':
        default:
          return summarizedContext || 'No additional context available.';
      }
    },
    [activeGoalTitles, habitTitles, interestList, recentActionHighlights, visionText, summarizedContext]
  );

  const { mutate: requestPrompt, isPending: isPromptPending } = useMutation<
    string,
    Error,
    RequestPromptVariables
  >({
    mutationFn: async ({ userDraft, history, step }) => {
      const sequenceIndex = step % PROMPT_SEQUENCE_CONFIG.length;
      const theme = PROMPT_SEQUENCE_CONFIG[sequenceIndex];
      console.log(`[JournalCompose] Generating journaling prompt for slot ${sequenceIndex + 1}`);
      if (theme.isPreset) {
        let candidate = PRESET_PROMPT_POOL[Math.floor(Math.random() * PRESET_PROMPT_POOL.length)];
        let attempts = 0;
        while (history.includes(candidate) && attempts < 5) {
          candidate = PRESET_PROMPT_POOL[Math.floor(Math.random() * PRESET_PROMPT_POOL.length)];
          attempts += 1;
        }
        return candidate;
      }
      let latestPrompt = '';
      for (let attempt = 0; attempt < MAX_PROMPT_ATTEMPTS; attempt += 1) {
        const response = await generateText({
          messages: [
            {
              role: 'user',
              content: `${journifyPromptInstruction}\nSequence slot: ${sequenceIndex + 1} (${theme.label}).\nFocus: ${theme.instruction}\nContext for this slot: ${getThemeContext(theme.key)}\nGeneral context:\n${summarizedContext}\nCurrent draft: ${userDraft || 'User has not started typing.'}`,
            },
          ],
          temperature: 0.7,
          topP: 0.9,
          frequencyPenalty: 0.4,
          presencePenalty: 0.3,
        });
        const cleaned = response
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)[0] ?? '';
        const unquoted = cleaned.replace(/["“”]/g, '').trim();
        latestPrompt = unquoted.replace(/^\d+[).\-\s]*/, '').trim();
        if (!latestPrompt) {
          continue;
        }
        if (!isPromptTooSimilar(latestPrompt, history)) {
          return latestPrompt;
        }
        console.log(`[JournalCompose] Prompt attempt ${attempt + 1} too similar, regenerating`);
      }
      return latestPrompt;
    },
    onSuccess: result => {
      if (result) {
        setPromptText(result);
        setShowPrompt(true);
        setPromptHistory(prev => {
          const updated = [...prev, result];
          return updated.slice(-PROMPT_HISTORY_LIMIT);
        });
        setPromptSequenceStep(prev => (prev + 1) % PROMPT_SEQUENCE_CONFIG.length);
      }
    },
    onError: error => {
      console.error('[JournalCompose] Prompt generation failed', error);
      showToast('Unable to fetch a prompt right now. Please try again soon.', { type: 'info' });
    },
  });

  const { mutate, isPending } = useMutation<
    { tasks: string[]; habits: string[]; goals: string[]; insights: ReflectionInsightsData },
    Error,
    { content: string }
  >({
    mutationFn: async ({ content }: { content: string }) => {
      console.log('[JournalCompose] Starting analysis for entry');
      const prompt = `${REFLECTION_INSIGHTS_GUIDANCE}

Goal alignment context: ${goalAlignmentDirective}

Journal entry:
"""${content}"""`;

      try {
        const result = await generateText({ messages: [{ role: 'user', content: prompt }] });
        const jsonPayload = extractFirstJsonObject(result);
        if (!jsonPayload) {
          console.warn('[JournalCompose] AI response missing JSON payload');
          return { tasks: [], habits: [], goals: [], insights: EMPTY_INSIGHTS };
        }
        const parsed = JSON.parse(jsonPayload) as {
          tasks?: string[];
          habits?: string[];
          goals?: string[];
          insights?: Partial<ReflectionInsightsData>;
        };
        return {
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
          habits: Array.isArray(parsed.habits) ? parsed.habits : [],
          goals: Array.isArray(parsed.goals) ? parsed.goals : [],
          insights: normalizeInsights(parsed.insights),
        };
      } catch (error) {
        console.error('[JournalCompose] Analysis failed, returning empty actions', error);
        return { tasks: [], habits: [], goals: [], insights: EMPTY_INSIGHTS };
      }
    },
    onSuccess: (data, variables) => {
      console.log('[JournalCompose] Analysis complete, saving entry');
      const entry: JournalEntry = {
        id: Date.now().toString(),
        content: variables.content,
        createdAt: new Date().toISOString(),
        analyzed: true,
        extractedTodos: data.tasks,
        extractedHabits: data.habits,
        extractedGoals: data.goals,
        reflectionInsights: data.insights,
        mood: selectedMood ?? undefined,
      };
      addJournalEntry(entry);
      setEntryText('');
      try {
        router.push({
          pathname: '/reflection-results',
          params: {
            tasks: JSON.stringify(data.tasks),
            habits: JSON.stringify(data.habits),
            goals: JSON.stringify(data.goals),
            insights: JSON.stringify(data.insights),
            entryId: entry.id,
          },
        });
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error) {
        console.error('[JournalCompose] Failed to navigate to reflection results', error);
        showToast('Entry saved, but navigation failed. Please try again.', { type: 'info' });
      }
    },
    onError: error => {
      console.error('[JournalCompose] Failed to analyze entry', error);
      showToast('Unable to save reflection. Please try again shortly.', { type: 'info' });
    },
  });

  const handleSave = useCallback(() => {
    if (!trimmedText || isPending) {
      return;
    }
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    mutate({ content: trimmedText });
  }, [isPending, mutate, trimmedText]);

  const handlePromptRequest = useCallback(() => {
    if (isPromptPending) {
      return;
    }
    requestPrompt({ userDraft: trimmedText, history: promptHistory, step: promptSequenceStep });
  }, [isPromptPending, promptHistory, promptSequenceStep, requestPrompt, trimmedText]);

  const handlePromptToggle = useCallback(() => {
    if (showPrompt) {
      setShowPrompt(false);
      return;
    }
    setShowPrompt(true);
    if (!promptText) {
      handlePromptRequest();
    }
  }, [handlePromptRequest, promptText, showPrompt]);

  const saveDisabled = !trimmedText || isPending;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.screen}>
        <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
          <View style={styles.topBarRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.85}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 12 }}
              testID="close-journal-compose-button"
            >
              <ChevronLeft size={20} color={Colors.text} />
              <Text style={styles.backLabel}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.topTitle} numberOfLines={1}>
              New Thought
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saveDisabled}
              style={[styles.saveButton, saveDisabled && styles.saveButtonDisabled]}
              activeOpacity={0.85}
              testID="save-thought-button"
            >
              {isPending ? (
                <ActivityIndicator size="small" color={Colors.surface} />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.moodSection}>
              <Text style={styles.moodPrompt}>How are you feeling?</Text>
              <View style={styles.moodRow}>
                {moodOptions.map(option => {
                  const isActive = selectedMood === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => {
                        console.log(`[JournalCompose] Selected mood: ${option.value}`);
                        setSelectedMood(option.value);
                      }}
                      style={[styles.moodPill, isActive && styles.moodPillActive]}
                      activeOpacity={0.9}
                      testID={`mood-option-${option.value}`}
                    >
                      <Text style={styles.moodEmoji}>{option.emoji}</Text>
                      <Text style={[styles.moodLabel, isActive && styles.moodLabelActive]}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Thoughts</Text>
              <TouchableOpacity
                onPress={handlePromptToggle}
                style={styles.promptButton}
                activeOpacity={0.85}
                testID="prompt-generate-button"
              >
                <View style={styles.promptButtonContent}>
                  {showPrompt && <X size={16} color={Colors.text} />}
                  <Text style={styles.promptButtonText}>
                    {showPrompt ? 'Close prompt' : 'Give me ideas'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {showPrompt && (promptText || isPromptPending) && (
              <View style={styles.promptContainer} testID="journal-prompt-container">
                <View style={styles.promptRow}>
                  <Text style={styles.promptText}>
                    {isPromptPending ? 'Generating a mindful prompt…' : promptText}
                  </Text>
                  <TouchableOpacity
                    onPress={handlePromptRequest}
                    style={styles.regenButton}
                    activeOpacity={0.85}
                    disabled={isPromptPending}
                    testID="prompt-regenerate-button"
                  >
                    {isPromptPending ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <RefreshCcw size={18} color={Colors.textSoft} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="What's on your mind?"
                placeholderTextColor={Colors.textSecondary}
                multiline
                value={entryText}
                onChangeText={setEntryText}
                textAlignVertical="top"
                autoFocus
                testID="new-thought-input"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  topBarRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
  },
  backButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingVertical: 8,
    paddingRight: 8,
  },
  backLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center' as const,
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 16,
  },
  moodSection: {
    gap: 16,
  },
  moodPrompt: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  moodRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: 10,
  },
  moodPill: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center' as const,
    backgroundColor: Colors.background,
  },
  moodPillActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(50, 208, 193, 0.18)',
  },
  moodEmoji: {
    fontSize: 22,
    marginBottom: 6,
  },
  moodLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  moodLabelActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  sectionHeaderRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  promptButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 18,
    paddingVertical: 6,
    backgroundColor: Colors.background,
  },
  promptButtonContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  promptButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  promptContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  promptRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  promptText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    lineHeight: 22,
  },
  regenButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inputWrapper: {
    borderRadius: 20,
    padding: 4,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 0,
    borderWidth: 0,
    padding: 0,
    fontSize: 16,
    color: Colors.text,
    minHeight: 240,
    lineHeight: 22,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: Colors.surface,
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
