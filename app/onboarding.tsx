import { useRouter } from 'expo-router';
import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ChevronRight, X, ChevronLeft, Sparkles } from 'lucide-react-native';
import { useAppState } from '../contexts/AppStateContext';
import type { Vision } from '../types';
import Colors from '../constants/colors';

type OnboardingStep = 'name' | 'age' | 'gender' | 'interests' | 'goals' | 'encouragement' | 'vision' | 'ranking';

const AGE_GROUPS = [
  { value: '18-24', label: '18-24' },
  { value: '25-34', label: '25-34' },
  { value: '35-44', label: '35-44' },
  { value: '45-54', label: '45-54' },
  { value: '55+', label: '55+' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
] as const;

const GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
] as const;

const INTEREST_OPTIONS = [
  'Reading', 'Watching movie', 'Listening to music', 'Traveling', 'Cooking',
  'Playing sports', 'Working out', 'Playing video game', 'Gardening', 'Art',
  'Photography', 'Hiking or camping', 'Dancing', 'Singing', 'Playing instrument',
  'Writing', 'Attending live events', 'Socializing with friends', 'Cars',
];

const GOAL_OPTIONS = [
  { value: 'understand', label: 'Understand myself better' },
  { value: 'growth', label: 'Track personal growth' },
  { value: 'achieve', label: 'Achieve my goals and dreams' },
  { value: 'productive', label: 'Be more productive' },
  { value: 'organized', label: 'Be more organized' },
  { value: 'manage', label: 'Manage emotions and stress' },
  { value: 'habits', label: 'Build habits and consistency' },
];

const LIFE_AREAS = [
  { value: 'relationship', label: 'Relationship' },
  { value: 'career', label: 'Career' },
  { value: 'health', label: 'Health' },
  { value: 'finance', label: 'Finance' },
  { value: 'growth', label: 'Growth' },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, updateUserProfile, updateVision, consumeVisionGuidePendingVision } = useAppState();
  
  const [step, setStep] = useState<OnboardingStep>('name');
  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [gender, setGender] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState('');
  const [visionText, setVisionText] = useState('');
  const [lifeAreaRanking, setLifeAreaRanking] = useState<string[]>([]);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state.visionGuideSession?.pendingVision) {
      setVisionText(state.visionGuideSession.pendingVision);
      consumeVisionGuidePendingVision();
    }
  }, [state.visionGuideSession?.pendingVision, consumeVisionGuidePendingVision]);

  const steps: OnboardingStep[] = ['name', 'age', 'gender', 'interests', 'goals', 'encouragement', 'vision', 'ranking'];
  const currentStepIndex = steps.indexOf(step);
  const totalSteps = steps.length + 6;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  const animateTransition = useCallback((callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTimeout(callback, 150);
  }, [fadeAnim]);

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    animateTransition(() => {
      if (step === 'age') setStep('name');
      else if (step === 'gender') setStep('age');
      else if (step === 'interests') setStep('gender');
      else if (step === 'goals') setStep('interests');
      else if (step === 'encouragement') setStep('goals');
      else if (step === 'vision') setStep('encouragement');
      else if (step === 'ranking') setStep('vision');
    });
  };

  const handleNext = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    animateTransition(() => {
      if (step === 'name') setStep('age');
      else if (step === 'age') setStep('gender');
      else if (step === 'gender') setStep('interests');
      else if (step === 'interests') setStep('goals');
      else if (step === 'goals') setStep('encouragement');
      else if (step === 'encouragement') setStep('vision');
      else if (step === 'vision') setStep('ranking');
      else if (step === 'ranking') handleComplete();
    });
  };

  const handleSkip = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    updateUserProfile({ onboardingCompleted: true });
    router.replace('/(tabs)/today');
  };

  const handleComplete = () => {
    const profileData = {
      name: name || undefined,
      ageGroup: ageGroup as any || undefined,
      gender: gender as any || undefined,
      interests: interests.length > 0 ? interests : undefined,
      goals: goals.length > 0 ? goals : undefined,
      lifeAreaRanking: lifeAreaRanking as any || undefined,
      onboardingCompleted: true,
    };

    updateUserProfile(profileData);

    if (visionText.trim()) {
      const vision: Vision = {
        text: visionText,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updateVision(vision);
    }

    router.push({ pathname: '/goal-setup', params: { fromOnboarding: 'true' } });
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const addCustomInterest = () => {
    if (customInterest.trim() && !interests.includes(customInterest.trim())) {
      setInterests(prev => [...prev, customInterest.trim()]);
      setCustomInterest('');
    }
  };

  const toggleGoal = (goal: string) => {
    setGoals(prev =>
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const addCustomGoal = () => {
    if (customGoal.trim() && !goals.includes(customGoal.trim())) {
      setGoals(prev => [...prev, customGoal.trim()]);
      setCustomGoal('');
    }
  };

  const toggleRanking = (area: string) => {
    setLifeAreaRanking(prev => {
      if (prev.includes(area)) {
        return prev.filter(a => a !== area);
      } else {
        return [...prev, area];
      }
    });
  };

  const canProceed = () => {
    if (step === 'name') return name.trim().length > 0;
    if (step === 'age') return ageGroup !== '';
    if (step === 'gender') return gender !== '';
    if (step === 'interests') return interests.length > 0;
    if (step === 'goals') return goals.length > 0;
    if (step === 'encouragement') return true;
    if (step === 'vision') return visionText.trim().length > 0;
    if (step === 'ranking') return lifeAreaRanking.length === LIFE_AREAS.length;
    return true;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          {step !== 'name' && step !== 'encouragement' && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <ChevronLeft size={24} color={Colors.text} />
            </TouchableOpacity>
          )}
          {(step === 'name' || step === 'encouragement') && <View style={styles.backButton} />}
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {step === 'name' && (
            <View style={styles.stepContainer}>
              <Text style={styles.question}>What's your name?</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your name"
                placeholderTextColor={Colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>
          )}

          {step === 'age' && (
            <View style={styles.stepContainer}>
              <Text style={styles.question}>Which age group do you belong to?</Text>
              <View style={styles.optionsContainer}>
                {AGE_GROUPS.map((group) => (
                  <TouchableOpacity
                    key={group.value}
                    style={[styles.optionButton, ageGroup === group.value && styles.optionButtonSelected]}
                    onPress={() => setAgeGroup(group.value)}
                  >
                    <Text style={[styles.optionText, ageGroup === group.value && styles.optionTextSelected]}>
                      {group.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 'gender' && (
            <View style={styles.stepContainer}>
              <Text style={styles.question}>How do you identify yourself?</Text>
              <View style={styles.optionsContainer}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g.value}
                    style={[styles.optionButton, gender === g.value && styles.optionButtonSelected]}
                    onPress={() => setGender(g.value)}
                  >
                    <Text style={[styles.optionText, gender === g.value && styles.optionTextSelected]}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 'interests' && (
            <View style={styles.stepContainer}>
              <Text style={styles.question}>What are your hobbies and interests?</Text>
              <Text style={styles.subtitle}>Select all that apply</Text>
              <View style={styles.multiSelectContainer}>
                {INTEREST_OPTIONS.map((interest) => (
                  <TouchableOpacity
                    key={interest}
                    style={[styles.chip, interests.includes(interest) && styles.chipSelected]}
                    onPress={() => toggleInterest(interest)}
                  >
                    <Text style={[styles.chipText, interests.includes(interest) && styles.chipTextSelected]}>
                      {interest}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Add your own..."
                  placeholderTextColor={Colors.textSecondary}
                  value={customInterest}
                  onChangeText={setCustomInterest}
                  onSubmitEditing={addCustomInterest}
                />
                <TouchableOpacity style={styles.addButton} onPress={addCustomInterest}>
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              {interests.filter(i => !INTEREST_OPTIONS.includes(i)).map((interest) => (
                <View key={interest} style={[styles.chip, styles.chipSelected, styles.customChip]}>
                  <Text style={[styles.chipText, styles.chipTextSelected]}>{interest}</Text>
                  <TouchableOpacity onPress={() => toggleInterest(interest)}>
                    <X size={16} color={Colors.surface} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {step === 'goals' && (
            <View style={styles.stepContainer}>
              <Text style={styles.question}>What do you wish to accomplish with Journify?</Text>
              <Text style={styles.subtitle}>Select all that apply</Text>
              <View style={styles.optionsContainer}>
                {GOAL_OPTIONS.map((goal) => (
                  <TouchableOpacity
                    key={goal.value}
                    style={[styles.optionButton, goals.includes(goal.value) && styles.optionButtonSelected]}
                    onPress={() => toggleGoal(goal.value)}
                  >
                    <Text style={[styles.optionText, goals.includes(goal.value) && styles.optionTextSelected]}>
                      {goal.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Other (please specify)"
                  placeholderTextColor={Colors.textSecondary}
                  value={customGoal}
                  onChangeText={setCustomGoal}
                  onSubmitEditing={addCustomGoal}
                />
                <TouchableOpacity style={styles.addButton} onPress={addCustomGoal}>
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              {goals.filter(g => !GOAL_OPTIONS.some(opt => opt.value === g)).map((goal) => (
                <View key={goal} style={[styles.chip, styles.chipSelected, styles.customChip]}>
                  <Text style={[styles.chipText, styles.chipTextSelected]}>{goal}</Text>
                  <TouchableOpacity onPress={() => toggleGoal(goal)}>
                    <X size={16} color={Colors.surface} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {step === 'encouragement' && (
            <View style={styles.stepContainer}>
              <View style={styles.encouragementContainer}>
                <Animated.View style={[styles.encouragementContent, { opacity: fadeAnim }]}>
                  <Text style={styles.encouragementText}>
                    Thank you for sharing that. You're in the right place.
                  </Text>
                  <Text style={styles.encouragementText}>
                    Journify is here to guide you with clarity, simplicity, and small, meaningful steps.
                  </Text>
                </Animated.View>
              </View>
            </View>
          )}

          {step === 'vision' && (
            <View style={styles.stepContainer}>
              <Text style={styles.sectionTitle}>Vision</Text>
              <Text style={[styles.question, styles.centeredText]}>Who do you want to be, and what life would feel meaningful?</Text>
              <Text style={[styles.subtitle, styles.centeredText]}>Think gently about the life you want to grow into.</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, styles.visionInputArea]}
                placeholder="I want to..."
                placeholderTextColor={Colors.textSecondary}
                value={visionText}
                onChangeText={setVisionText}
                multiline
                textAlignVertical="top"
                autoFocus
              />
              <TouchableOpacity
                style={styles.helperButton}
                onPress={() => {
                  router.push({
                    pathname: '/vision-guide',
                    params: {
                      name: name || state.userProfile?.name || 'You',
                    },
                  });
                }}
                testID="vision-helper-button"
              >
                <Sparkles size={16} color={Colors.primary} />
                <Text style={styles.helperText}>Help me figure out</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'ranking' && (
            <View style={styles.stepContainer}>
              <Text style={styles.sectionTitle}>Aspiration</Text>
              <Text style={styles.question}>Rank the following areas of life in order of importance</Text>
              <Text style={styles.subtitle}>Tap to select in order (1 being most important)</Text>
              <View style={styles.optionsContainer}>
                {LIFE_AREAS.map((area) => {
                  const rank = lifeAreaRanking.indexOf(area.value);
                  const isSelected = rank !== -1;
                  return (
                    <TouchableOpacity
                      key={area.value}
                      style={[styles.rankButton, isSelected && styles.rankButtonSelected]}
                      onPress={() => toggleRanking(area.value)}
                    >
                      {isSelected && (
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankBadgeText}>{rank + 1}</Text>
                        </View>
                      )}
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {area.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!canProceed()}
        >
          <Text style={styles.nextButtonText}>
            {step === 'encouragement' ? 'Begin my journey' : 'Continue'}
          </Text>
          {step !== 'encouragement' && <ChevronRight size={20} color={Colors.surface} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  topRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  skipButton: {
    padding: 4,
  },
  skipText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  stepContainer: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 16,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  question: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 16,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top' as const,
  },
  visionInputArea: {
    height: 260,
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
  multiSelectContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  chipTextSelected: {
    color: Colors.surface,
  },
  customInputContainer: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 8,
  },
  customInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center' as const,
  },
  addButtonText: {
    color: Colors.surface,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  customChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    alignSelf: 'flex-start' as const,
    marginTop: 8,
  },
  rankButton: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  rankButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
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
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: Colors.surface,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  helperButton: {
    marginTop: 12,
    alignSelf: 'flex-end' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  helperText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 24,
  },
  loadingText: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  centeredText: {
    textAlign: 'center' as const,
  },
  encouragementContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 60,
  },
  encouragementContent: {
    paddingHorizontal: 24,
    gap: 24,
  },
  encouragementText: {
    fontSize: 20,
    lineHeight: 32,
    color: Colors.text,
    textAlign: 'center' as const,
    fontWeight: '500' as const,
  },
});
