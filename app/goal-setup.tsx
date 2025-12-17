import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, X, CheckCircle2, RefreshCw, Sparkles, Heart, Briefcase, Activity, Wallet, Sprout, Clock, Hash } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

import { useMutation } from '@tanstack/react-query';
import { useAppState } from '../contexts/AppStateContext';
import { generateText } from '@rork-ai/toolkit-sdk';
import { HARDCODED_GOAL_SUGGESTIONS } from '../constants/goal-suggestions';
import Colors from '../constants/colors';
import type { Goal, GoalTask, Habit, LifeArea } from '../types';

const LIFE_AREA_THEMES = {
  relationship: {
    color: '#FF7FA5',
    glow: 'rgba(255, 127, 165, 0.85)',
    inner: 'rgba(255, 255, 255, 0.42)',
  },
  career: {
    color: '#4A9DFF',
    glow: 'rgba(74, 157, 255, 0.85)',
    inner: 'rgba(255, 255, 255, 0.38)',
  },
  health: {
    color: '#47c447',
    glow: 'rgba(71, 196, 71, 0.8)',
    inner: 'rgba(255, 255, 255, 0.45)',
  },
  finance: {
    color: '#FFC857',
    glow: 'rgba(255, 200, 87, 0.85)',
    inner: 'rgba(255, 255, 255, 0.40)',
  },
  growth: {
    color: '#AF9BFF',
    glow: 'rgba(175, 155, 255, 0.85)',
    inner: 'rgba(255, 255, 255, 0.40)',
  },
} as const;

const LIFE_AREA_ICON_COLORS: Record<LifeArea, string> = {
  relationship: '#FF7FA5',
  career: '#4A9DFF',
  health: '#47c447',
  finance: '#FFC857',
  growth: '#AF9BFF',
};

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 'loading';

interface ActionItem {
  type: 'goal-task' | 'habit';
  title: string;
  frequency?: 'daily' | 'weekly';
  weekDays?: number[];
  trackingType?: 'checkbox' | 'numeric' | 'time';
  targetValue?: number;
  unit?: string;
}

export default function GoalSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { addGoal, addGoalTask, addHabit, state } = useAppState();
  
  const fromOnboarding = params.fromOnboarding === 'true';

  const [step, setStep] = useState<Step>(1);
  const [selectedLifeArea, setSelectedLifeArea] = useState<LifeArea | ''>('');
  const [goalTitle, setGoalTitle] = useState((params.goalTitle as string) || '');
  const [why, setWhy] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');
  const [actionInput, setActionInput] = useState('');
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [actionType, setActionType] = useState<'goal-task' | 'habit'>('goal-task');
  const [aiSuggestions, setAiSuggestions] = useState<{ tasks: string[]; habits: string[] }>({ tasks: [], habits: [] });
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null);
  const [tempHabitData, setTempHabitData] = useState<ActionItem | null>(null);
  const [aiGoalSuggestions, setAiGoalSuggestions] = useState<string[]>([]);
  const [aiGoalIntro, setAiGoalIntro] = useState<string>('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  useEffect(() => {
    setSuggestionIndex(0);
    setAiGoalSuggestions([]);
    setAiGoalIntro('');
  }, [selectedLifeArea]);

  const pathMutation = useMutation({
    mutationFn: async (goal: string) => {
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

Goal: "${goal}"

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
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Failed to parse AI response');
      return JSON.parse(jsonMatch[0]) as { tasks: { title: string }[]; habits: { title: string }[] };
    },
    onSuccess: (data) => {
      setAiSuggestions({ 
        tasks: data.tasks.map(t => t.title), 
        habits: data.habits.map(h => h.title) 
      });
    },
  });

  const handleBack = () => {
    if (typeof step === 'number' && step > 1) {
      setStep((s) => ((typeof s === 'number' ? s : 1) - 1) as Step);
    } else {
      router.back();
    }
  };

  const handleNext = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setStep((s) => ((typeof s === 'number' ? s : 1) + 1) as Step);
  };

  const handleAddAction = () => {
    if (actionInput.trim()) {
      const newAction: ActionItem = { 
        type: actionType, 
        title: actionInput.trim(),
        // Default values for habit
        frequency: 'daily',
        trackingType: 'checkbox',
        weekDays: [],
      };
      
      const newIndex = actions.length;
      setActions([...actions, newAction]);
      setActionInput('');
      
      if (actionType === 'habit') {
        setTempHabitData({ ...newAction });
        setEditingActionIndex(newIndex);
      }
    }
  };

  const handleAddSuggestion = (suggestion: string, type: 'goal-task' | 'habit') => {
    if (actions.find(a => a.title === suggestion)) {
      return;
    }
    
    const newAction: ActionItem = { 
      type, 
      title: suggestion,
      frequency: 'daily',
      trackingType: 'checkbox',
      weekDays: [],
    };
    
    const newIndex = actions.length;
    setActions([...actions, newAction]);
    
    if (type === 'habit') {
      setTempHabitData({ ...newAction });
      setEditingActionIndex(newIndex);
    }
    
    if (type === 'goal-task') {
      setAiSuggestions(prev => ({
        ...prev,
        tasks: prev.tasks.filter(t => t !== suggestion)
      }));
    } else {
      setAiSuggestions(prev => ({
        ...prev,
        habits: prev.habits.filter(h => h !== suggestion)
      }));
    }
  };

  const handleSaveHabit = () => {
    if (editingActionIndex !== null && tempHabitData) {
      const updatedActions = [...actions];
      updatedActions[editingActionIndex] = tempHabitData;
      setActions(updatedActions);
      setEditingActionIndex(null);
      setTempHabitData(null);
    }
  };

  const handleCancelEdit = () => {
    // If it was a new habit (last added and no custom config yet), maybe remove it? 
    // For now just close modal, reverting changes.
    setEditingActionIndex(null);
    setTempHabitData(null);
  };

  const openHabitEdit = (index: number) => {
    const action = actions[index];
    if (action.type === 'habit') {
      setTempHabitData({ ...action });
      setEditingActionIndex(index);
    }
  };

  const handleRemoveAction = (index: number) => {
    const removedAction = actions[index];
    const wasUserCreated = !aiSuggestions.tasks.includes(removedAction.title) && !aiSuggestions.habits.includes(removedAction.title);
    
    setActions(actions.filter((_, i) => i !== index));
    
    if (removedAction && !wasUserCreated) {
      if (removedAction.type === 'goal-task') {
        setAiSuggestions(prev => ({
          ...prev,
          tasks: [...prev.tasks, removedAction.title]
        }));
      } else {
        setAiSuggestions(prev => ({
          ...prev,
          habits: [...prev.habits, removedAction.title]
        }));
      }
    }
  };

  const handleEditStep = (targetStep: Step) => {
    setStep(targetStep);
  };



  const generateGoalSuggestions = useMutation({
    mutationFn: async () => {
      const lifeAreaLabel = getLifeAreasOrdered().find(a => a.value === selectedLifeArea)?.label || selectedLifeArea;
      
      const vision = state.vision?.text || 'Not specified';
      const interests = state.userProfile?.interests?.join(', ') || 'Not specified';
      const rankedLifeAreas = state.userProfile?.lifeAreaRanking?.join(', ') || 'Not specified';

      const prompt = `You are Journify’s Goal Suggestion Assistant.

Generate 3–6 concise, personalized goal suggestions based on:
1. Vision: ${vision}
2. Interests: ${interests}
3. Ranked Areas: ${rankedLifeAreas}
4. Focus Area: ${lifeAreaLabel}

Guidelines:
- Keep suggestions concise (3-7 words).
- Focus ONLY on the "what" (the core objective).
- Do NOT include "how" or "why" (avoid conjunctions like "by", "through", "so that", "to", "in order to").
- Focus on identity and long-term growth.
- Align with the focus area and vision.
- Avoid numeric targets or chores.

Examples:
- “Build physical vitality”
- “Strengthen social confidence”
- “Develop a mindfulness practice”
- “Grow creative expression”
- “Improve financial stability”
- "Deepen relationship with spouse"

Return ONLY a JSON object:
{
  "introduction": "Short friendly introduction",
  "goals": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`;
      
      const result = await generateText({ messages: [{ role: 'user', content: prompt }] });
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Failed to parse AI response');
      return JSON.parse(jsonMatch[0]) as { introduction: string, goals: string[] };
    },
    onSuccess: (data) => {
      setAiGoalSuggestions(data.goals);
      setAiGoalIntro(data.introduction);
    },
  });

  const handleInspireMe = () => {
    const area = selectedLifeArea as keyof typeof HARDCODED_GOAL_SUGGESTIONS;
    const suggestions = HARDCODED_GOAL_SUGGESTIONS[area];

    if (suggestions && suggestionIndex < suggestions.length) {
      // Taking 5 suggestions at a time
      const nextBatch = suggestions.slice(suggestionIndex, suggestionIndex + 5);
      setAiGoalSuggestions(nextBatch);
      setAiGoalIntro("Here are some ideas based on what you shared...");
      setSuggestionIndex(prev => prev + 5);
    } else {
      generateGoalSuggestions.mutate();
    }
  };

  const handleComplete = () => {
    const goalId = Date.now().toString();
    const createdGoalTasks: GoalTask[] = [];
    const createdHabits: string[] = [];


    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const goalLifeArea = selectedLifeArea || undefined;
    const linkedAspiration = goalLifeArea ? state.aspirations.find(a => a.lifeArea === goalLifeArea) : undefined;

    let taskDayOffset = 0;

    actions.forEach((action) => {
      if (action.type === 'goal-task') {
        const taskDate = new Date(today);
        taskDate.setDate(taskDate.getDate() + taskDayOffset);
        const dueDate = taskDate.toISOString().split('T')[0];
        taskDayOffset += 1;
        
        const task: GoalTask = {
          id: Date.now().toString() + Math.random(),
          title: action.title,
          completed: false,
          goalId,
          dueDate,
          createdAt: new Date().toISOString(),
        };
        addGoalTask(task);
        createdGoalTasks.push(task);
      } else if (action.type === 'habit') {
        const habitId = `${goalId}-habit-${Date.now()}-${Math.random()}`;
        
        const habit: Habit = {
          id: habitId,
          title: action.title,
          frequency: action.frequency || 'daily',
          weekDays: action.weekDays,
          trackingType: action.trackingType || 'checkbox',
          targetValue: action.targetValue,
          unit: action.unit,
          completedDates: [],
          createdAt: new Date().toISOString(),
          goalId,
          aspirationId: linkedAspiration?.id,
          lifeArea: goalLifeArea,
        };
        addHabit(habit);
        createdHabits.push(habitId);
      }
    });

    const aspirationId = linkedAspiration?.id;

    const goal: Goal = {
      id: goalId,
      title: goalTitle,
      why,
      successCriteria,
      targetDate: undefined,
      goalTaskIds: createdGoalTasks.map((t) => t.id),
      habitIds: createdHabits,
      createdAt: new Date().toISOString(),
      aspirationId,
      aspirationIds: aspirationId ? [aspirationId] : [],
      lifeArea: goalLifeArea,
    };

    addGoal(goal);

    if (fromOnboarding) {
      setStep('loading');
      
      setTimeout(() => {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        router.replace('/(tabs)/today');
      }, 1500);
    } else {
       if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    }
  };

  const canProceed = () => {
    if (step === 1) return selectedLifeArea !== '';
    if (step === 2) return goalTitle.trim().length > 0;
    if (step === 3) return why.trim().length > 0;
    if (step === 4) return successCriteria.trim().length > 0;
    if (step === 5) return true;
    return true;
  };

  const getLifeAreasOrdered = () => {
    const lifeAreas = ['relationship', 'career', 'health', 'finance', 'growth'] as const;
    const icons = {
      relationship: Heart,
      career: Briefcase,
      health: Activity,
      finance: Wallet,
      growth: Sprout,
    };
    
    let orderedAreas = [];

    if (state.userProfile?.lifeAreaRanking && state.userProfile.lifeAreaRanking.length > 0) {
      orderedAreas = state.userProfile.lifeAreaRanking.map((area, index) => ({
        value: area,
        label: area.charAt(0).toUpperCase() + area.slice(1),
        rank: index + 1,
        icon: icons[area],
        color: LIFE_AREA_ICON_COLORS[area],
      }));
    } else {
      orderedAreas = lifeAreas.map(area => ({
        value: area,
        label: area.charAt(0).toUpperCase() + area.slice(1),
        rank: null,
        icon: icons[area],
        color: LIFE_AREA_ICON_COLORS[area],
      })).sort((a, b) => a.label.localeCompare(b.label));
    }

    return orderedAreas;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.centerHeader}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: fromOnboarding ? `${((8 + (typeof step === 'number' ? step : 0)) / 14) * 100}%` : `${(typeof step === 'number' ? step : 0) / 6 * 100}%` }]} />
            </View>
          </View>
          {fromOnboarding ? (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => router.replace('/(tabs)/today')}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepHeaderTitle}>{fromOnboarding ? 'Set Your First Goal' : 'Set A Goal'}</Text>
              <Text style={styles.stepTitle}>Which area feels most meaningful for you to focus on next?</Text>
              <Text style={styles.stepSubtext}>The life areas are listed in the order of importance that you specified (if completed).</Text>
              <View style={styles.optionsContainer}>
                {getLifeAreasOrdered().map((area) => (
                  <TouchableOpacity
                    key={area.value}
                    style={[styles.optionButton, selectedLifeArea === area.value && styles.optionButtonSelected]}
                    onPress={() => setSelectedLifeArea(area.value)}
                  >
                     <View style={styles.lifeAreaIconWrapper}>
                        <area.icon size={20} color={area.color ?? Colors.text} />
                      </View>
                    <Text style={[styles.optionText, selectedLifeArea === area.value && styles.optionTextSelected]}>
                      {area.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepHeaderTitle}>Your Goal</Text>
              
              {(() => {
                const areaDetails = getLifeAreasOrdered().find(a => a.value === selectedLifeArea);
                if (!areaDetails) return null;
                
                const theme = LIFE_AREA_THEMES[selectedLifeArea as keyof typeof LIFE_AREA_THEMES] || LIFE_AREA_THEMES.health;

                return (
                  <View style={styles.floatingGlassContainer}>
                    <View style={[styles.glowEffect, { 
                      backgroundColor: theme.color, 
                      shadowColor: theme.glow,
                      shadowOpacity: 1, // Ensure the glow color is vibrant
                    }]} />
                    <BlurView
                      style={[styles.glassCircle, { 
                        borderColor: theme.inner,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)' // Slight white tint for glass body
                      }]}
                      intensity={60}
                      tint="light"
                    >
                      <View style={styles.glassContent}>
                        <areaDetails.icon size={32} color={theme.color} />
                        <Text style={styles.glassLabel}>{areaDetails.label}</Text>
                      </View>
                    </BlurView>
                  </View>
                );
              })()}

              <Text style={styles.stepTitle}>What would you like to accomplish in this area?</Text>
              <Text style={styles.stepSubtext}>Start with one that feels important to you.</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="I want to..."
                placeholderTextColor={Colors.textSecondary}
                value={goalTitle}
                onChangeText={setGoalTitle}
                multiline
                textAlignVertical="top"
                autoFocus
              />
              <TouchableOpacity
                style={styles.inspireMeButton}
                onPress={handleInspireMe}
                disabled={generateGoalSuggestions.isPending}
              >
                <Sparkles size={16} color={Colors.primary} />
                <Text style={styles.inspireMeText}>
                  {generateGoalSuggestions.isPending ? '...' : 'Inspire me'}
                </Text>
              </TouchableOpacity>
              {aiGoalSuggestions.length > 0 && (
                <View style={styles.goalSuggestionsContainer}>
                  {aiGoalIntro ? <Text style={styles.suggestionsDescription}>{aiGoalIntro}</Text> : null}
                  {aiGoalSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.goalSuggestionCard}
                      onPress={() => {
                        setGoalTitle(suggestion);
                        setAiGoalSuggestions([]);
                        setAiGoalIntro('');
                      }}
                    >
                      <Text style={styles.goalSuggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepHeaderTitle}>Your Why</Text>
              <Text style={styles.stepTitle}>Why is this goal important to you?</Text>
              <Text style={styles.stepSubtext}>What positive change would this bring?</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="This is important to me because..."
                placeholderTextColor={Colors.textSecondary}
                value={why}
                onChangeText={setWhy}
                multiline
                textAlignVertical="top"
                autoFocus
              />
            </View>
          )}

          {step === 4 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepHeaderTitle}>Success Criteria</Text>
              <Text style={styles.stepTitle}>What would &apos;success&apos; look like for you in this goal?</Text>
              <Text style={styles.stepSubtext}>Describe how life looks when you know you’re on track.</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="If this goal is successful, I'll be able to..."
                placeholderTextColor={Colors.textSecondary}
                value={successCriteria}
                onChangeText={setSuccessCriteria}
                multiline
                textAlignVertical="top"
                autoFocus
              />
            </View>
          )}

          {step === 5 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepHeaderTitle}>Your Next Step</Text>
              <Text style={styles.stepTitle}>What small steps could help you move toward this?</Text>
              <Text style={styles.stepSubtext}>What&apos;s one small but meaningful step that would move you closer?</Text>

              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, actionType === 'goal-task' && styles.toggleButtonActive]}
                  onPress={() => setActionType('goal-task')}
                >
                  <Text style={[styles.toggleButtonText, actionType === 'goal-task' && styles.toggleButtonTextActive]}>
                    Task
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, actionType === 'habit' && styles.toggleButtonActive]}
                  onPress={() => setActionType('habit')}
                >
                  <Text style={[styles.toggleButtonText, actionType === 'habit' && styles.toggleButtonTextActive]}>
                    Habit
                  </Text>
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
                <TouchableOpacity style={styles.addButton} onPress={handleAddAction}>
                  <Plus size={20} color={Colors.surface} />
                </TouchableOpacity>
              </View>

              {actions.map((action, index) => (
                <TouchableOpacity key={index} style={styles.actionCard} onPress={() => openHabitEdit(index)} disabled={action.type !== 'habit'}>
                  <View style={styles.actionIconWrapper}>
                    {action.type === 'goal-task' ? (
                      <CheckCircle2 size={18} color={Colors.primary} />
                    ) : (
                      <RefreshCw size={18} color={Colors.accent} />
                    )}
                  </View>
                  <View style={styles.actionCardContent}>
                    <Text style={styles.actionType}>{action.type === 'goal-task' ? 'Task' : 'Habit'}</Text>
                    <Text style={styles.actionText}>{action.title}</Text>
                     {action.type === 'habit' && (
                      <Text style={styles.habitDetailsText}>
                         {action.frequency === 'daily' 
                           ? 'Daily' 
                           : `Weekly on ${action.weekDays?.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ') || 'some days'}`
                         } • {action.trackingType === 'checkbox' ? 'Done/Not Done' : action.trackingType === 'numeric' ? `Target: ${action.targetValue} ${action.unit}` : `Target: ${action.targetValue} min`}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveAction(index)}>
                    <X size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}

              {aiSuggestions.habits.length === 0 && aiSuggestions.tasks.length === 0 && (
                <TouchableOpacity
                  style={styles.pathButton}
                  onPress={() => pathMutation.mutate(goalTitle)}
                  disabled={pathMutation.isPending}
                >
                  <Sparkles size={20} color={Colors.primary} />
                  <Text style={styles.pathButtonText}>
                    {pathMutation.isPending ? 'Suggesting ideas...' : 'Suggest ideas for me'}
                  </Text>
                </TouchableOpacity>
              )}

              {pathMutation.isPending && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.loadingText}>Creating your suggestions...</Text>
                </View>
              )}

              {(aiSuggestions.tasks.length > 0 || aiSuggestions.habits.length > 0) && (
                <View style={styles.suggestionsSection}>
                  <Text style={styles.suggestionsTitle}>A few meaningful steps to consider</Text>
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
          )}

          {step === 6 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Review Your Goal</Text>

              <TouchableOpacity style={styles.reviewCard} onPress={() => handleEditStep(1)}>
                <Text style={styles.reviewLabel}>Life Area</Text>
                <Text style={styles.reviewText}>
                  {selectedLifeArea.charAt(0).toUpperCase() + selectedLifeArea.slice(1)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.reviewCard} onPress={() => handleEditStep(2)}>
                <Text style={styles.reviewLabel}>Goal</Text>
                <Text style={styles.reviewText}>{goalTitle}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.reviewCard} onPress={() => handleEditStep(3)}>
                <Text style={styles.reviewLabel}>Why</Text>
                <Text style={styles.reviewText}>{why}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.reviewCard} onPress={() => handleEditStep(4)}>
                <Text style={styles.reviewLabel}>Success Criteria</Text>
                <Text style={styles.reviewText}>{successCriteria}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.reviewCard} onPress={() => handleEditStep(5)}>
                <Text style={styles.reviewLabel}>Actions ({actions.length})</Text>
                {actions.map((action, index) => (
                  <View key={index} style={styles.actionItem}>
                    {action.type === 'goal-task' ? (
                      <CheckCircle2 size={16} color={Colors.primary} />
                    ) : (
                      <RefreshCw size={16} color={Colors.accent} />
                    )}
                    <Text style={styles.actionItemText}>
                      {action.title}
                    </Text>
                  </View>
                ))}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          {typeof step === 'number' && step < 6 ? (
            <TouchableOpacity
              style={[styles.nextButton, !canProceed() && styles.buttonDisabled]}
              onPress={handleNext}
              disabled={!canProceed()}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.nextButton} onPress={handleComplete}>
              <Text style={styles.nextButtonText}>Create Goal</Text>
            </TouchableOpacity>
          )}
        </View>

        {editingActionIndex !== null && tempHabitData && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
               <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Edit Habit</Text>
                  <TouchableOpacity onPress={handleCancelEdit}>
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
                      onPress={() => setTempHabitData({ ...tempHabitData, frequency: 'daily' })}
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
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
                        const isSelected = tempHabitData.weekDays?.includes(index);
                        return (
                          <TouchableOpacity
                            key={index}
                            style={[styles.weekDayButton, isSelected && styles.weekDayButtonSelected]}
                            onPress={() => {
                              const currentDays = tempHabitData.weekDays || [];
                              const newWeekDays = isSelected
                                ? currentDays.filter(d => d !== index)
                                : [...currentDays, index];
                              setTempHabitData({ ...tempHabitData, weekDays: newWeekDays });
                            }}
                          >
                            <Text style={[styles.weekDayText, isSelected && styles.weekDayTextSelected]}>
                              {day}
                            </Text>
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
                        onPress={() => setTempHabitData({ ...tempHabitData, trackingType: 'checkbox' })}
                      >
                        <CheckCircle2 size={20} color={tempHabitData.trackingType === 'checkbox' ? Colors.primary : Colors.textSecondary} />
                        <View style={styles.trackingOptionTextContainer}>
                          <Text style={styles.trackingOptionTitle}>Done / Not Done</Text>
                          <Text style={styles.trackingOptionDescription}>Simple checkbox</Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.trackingOptionCard, tempHabitData.trackingType === 'numeric' && styles.trackingOptionCardSelected]}
                        onPress={() => setTempHabitData({ ...tempHabitData, trackingType: 'numeric' })}
                      >
                        <Hash size={20} color={tempHabitData.trackingType === 'numeric' ? Colors.primary : Colors.textSecondary} />
                        <View style={styles.trackingOptionTextContainer}>
                           <Text style={styles.trackingOptionTitle}>Numeric Value</Text>
                           <Text style={styles.trackingOptionDescription}>Track pages, cups, etc.</Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.trackingOptionCard, tempHabitData.trackingType === 'time' && styles.trackingOptionCardSelected]}
                        onPress={() => setTempHabitData({ ...tempHabitData, trackingType: 'time' })}
                      >
                        <Clock size={20} color={tempHabitData.trackingType === 'time' ? Colors.primary : Colors.textSecondary} />
                         <View style={styles.trackingOptionTextContainer}>
                           <Text style={styles.trackingOptionTitle}>Time Spent</Text>
                           <Text style={styles.trackingOptionDescription}>Track duration</Text>
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
                         keyboardType="numeric"
                        value={tempHabitData.targetValue?.toString() ?? ''}
                        onChangeText={(text) => setTempHabitData({ ...tempHabitData, targetValue: text === '' ? undefined : Number(text) })}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Unit</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., pages"
                        value={tempHabitData.unit ?? ''}
                        onChangeText={(text) => setTempHabitData({ ...tempHabitData, unit: text })}
                      />
                    </View>
                  </View>
                )}

                {tempHabitData.trackingType === 'time' && (
                   <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Target Duration (minutes)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., 30"
                        keyboardType="numeric"
                        value={tempHabitData.targetValue?.toString() ?? ''}
                        onChangeText={(text) => setTempHabitData({ ...tempHabitData, targetValue: text === '' ? undefined : Number(text) })}
                      />
                    </View>
                )}

                <View style={{ height: 20 }} />

                <TouchableOpacity style={styles.saveButton} onPress={handleSaveHabit}>
                  <Text style={styles.saveButtonText}>Save Habit</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        )}
        {step === 'loading' && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Personalizing your Journify...</Text>
          </View>
        )}
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
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  centerHeader: {
    alignItems: 'center' as const,
    gap: 8,
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden' as const,
    width: 200,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContainer: {
    paddingTop: 20,
  },
  stepHeaderTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
    lineHeight: 30,
  },
  stepSubtext: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  stepDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 120,
  },
  toggleContainer: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center' as const,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  toggleButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  toggleButtonTextActive: {
    color: Colors.surface,
  },
  addActionContainer: {
    flexDirection: 'row' as const,
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  actionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  actionCardContent: {
    flex: 1,
  },
  actionType: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700' as const,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
  },
  actionText: {
    fontSize: 15,
    color: Colors.text,
  },
  pathButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignSelf: 'flex-end' as const,
  },
  pathButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  loadingContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginTop: 16,
  },
  suggestionsSection: {
    marginTop: 24,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  suggestionsDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  suggestionCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  suggestionText: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  pathCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pathCardLeft: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  pathIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  pathText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  optionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  optionCardDisabled: {
    opacity: 0.4,
  },
  optionContent: {
    flex: 1,
  },
  optionSelectArea: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.surface,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  optionDescriptionEmpty: {
    fontStyle: 'italic' as const,
    color: Colors.primary,
  },
  trackingOptions: {
    marginTop: 16,
  },
  trackingOptionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  trackingOptionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  trackingOptionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  inputGroup: {
    gap: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  smallInput: {
    marginBottom: 0,
  },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
  },
  reviewText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  actionItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginTop: 8,
  },
  actionItemText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  bottomSpacer: {
    height: 40,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  datePickerButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: 16,
  },
  datePickerButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  textDisabled: {
    color: Colors.textSecondary,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  optionButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  optionText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  rankBadgeText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.surface,
  },
  modalOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  modalHeader: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  modalOption: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  modalOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  modalOptionTextSelected: {
    color: Colors.surface,
  },
  weekDaysContainer: {
    marginTop: 16,
    gap: 12,
  },
  weekDaysLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  weekDaysRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
  },
  weekDayButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  weekDayButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  weekDayTextSelected: {
    color: Colors.surface,
  },
  saveWeeklyButton: {
    marginTop: 8,
  },
  lifeAreaIconWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspireMeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignSelf: 'flex-end',
  },
  inspireMeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  habitDetailsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
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
  trackingOptionTextContainer: {
    flex: 1,
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
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  goalSuggestionsContainer: {
    marginTop: 16,
    gap: 12,
  },
  goalSuggestionCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  goalSuggestionText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  loadingOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 24,
    zIndex: 1000,
  },
  loadingText: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  suggestionIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 8,
  },
  skipButton: {
    padding: 4,
  },
  skipText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  cancelButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  floatingGlassContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 30,
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    opacity: 0.3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 15, // For Android fallback
  },
  glassCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  glassContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  glassLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
});
