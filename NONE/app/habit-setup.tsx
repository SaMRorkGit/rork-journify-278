import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Check, Heart, Briefcase, Activity, Wallet, Sprout, CheckCircle2, Hash, Clock } from 'lucide-react-native';
import { useState, type ComponentType } from 'react';
import * as Haptics from 'expo-haptics';
import { useAppState } from '../contexts/AppStateContext';
import Colors from '../constants/colors';
import type { Habit, HabitTrackingType, LifeArea } from '../types';

type Step = 1 | 2 | 3 | 4;

const LIFE_AREA_ORDER: LifeArea[] = ['relationship', 'career', 'health', 'finance', 'growth'];

const LIFE_AREA_OPTIONS: Record<LifeArea, { label: string; Icon: ComponentType<{ size?: number; color?: string }>; color: string }> = {
  relationship: { label: 'Relationship', Icon: Heart, color: '#FF7FA5' },
  career: { label: 'Career', Icon: Briefcase, color: '#4A9DFF' },
  health: { label: 'Health', Icon: Activity, color: '#47c447' },
  finance: { label: 'Finance', Icon: Wallet, color: '#FFC857' },
  growth: { label: 'Growth', Icon: Sprout, color: '#AF9BFF' },
};

const DAYS = [
  { label: 'S', value: 0 },
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'T', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 },
];

export default function HabitSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { addHabit, state } = useAppState();

  const [step, setStep] = useState<Step>(1);
  const [habitTitle, setHabitTitle] = useState((params.habitTitle as string) || '');
  const [trackingType, setTrackingType] = useState<HabitTrackingType>('checkbox');
  const [unit, setUnit] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [weekDays, setWeekDays] = useState<number[]>([]);
  const [selectedLifeArea, setSelectedLifeArea] = useState<LifeArea | undefined>(undefined);

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as Step);
    } else {
      router.back();
    }
  };

  const handleNext = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setStep((s) => (s + 1) as Step);
  };

  const handleComplete = () => {
    const linkedAspiration = selectedLifeArea ? state.aspirations.find(a => a.lifeArea === selectedLifeArea) : undefined;
    
    const habit: Habit = {
      id: Date.now().toString(),
      title: habitTitle,
      trackingType,
      frequency,
      weekDays: frequency === 'weekly' ? weekDays : undefined,
      unit: trackingType === 'numeric' ? unit : trackingType === 'time' ? 'min' : undefined,
      targetValue: trackingType === 'numeric' || trackingType === 'time' ? parseFloat(targetValue) : undefined,
      completedDates: [],
      createdAt: new Date().toISOString(),
      aspirationId: linkedAspiration?.id,
      lifeArea: selectedLifeArea,
    };

    addHabit(habit);

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    router.back();
  };

  const canProceed = () => {
    if (step === 1) return habitTitle.trim().length > 0;
    if (step === 2) {
      if (trackingType === 'checkbox') return true;
      if (trackingType === 'numeric') {
        return unit.trim().length > 0 && targetValue.trim().length > 0 && !isNaN(parseFloat(targetValue));
      }
      if (trackingType === 'time') {
        return targetValue.trim().length > 0 && !isNaN(parseFloat(targetValue));
      }
    }
    if (step === 3) {
      if (frequency === 'daily') return true;
      return weekDays.length > 0;
    }
    if (step === 4) return true;
    return false;
  };

  const toggleWeekDay = (day: number) => {
    if (weekDays.includes(day)) {
      setWeekDays(weekDays.filter((d) => d !== day));
    } else {
      setWeekDays([...weekDays, day].sort());
    }
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
              <View style={[styles.progressFill, { width: `${(step / 4) * 100}%` }]} />
            </View>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepHeaderTitle}>Habit Name</Text>
              <Text style={styles.stepTitle}>What habit would you like to develop?</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Exercise daily, Read books"
                placeholderTextColor={Colors.textSecondary}
                value={habitTitle}
                onChangeText={setHabitTitle}
                autoFocus
              />
            </View>
          )}


          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepHeaderTitle}>Tracking Method</Text>
              <Text style={styles.stepTitle}>How would you like to track it?</Text>

              <View style={styles.trackingOptions}>
                <TouchableOpacity
                  style={[styles.trackingOptionCard, trackingType === 'checkbox' && styles.trackingOptionCardSelected]}
                  onPress={() => setTrackingType('checkbox')}
                >
                  <CheckCircle2 size={24} color={trackingType === 'checkbox' ? Colors.primary : Colors.textSecondary} />
                  <View style={styles.trackingOptionTextContainer}>
                    <Text style={styles.trackingOptionTitle}>Done / Not Done</Text>
                    <Text style={styles.trackingOptionDescription}>Simple checkbox tracking</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.trackingOptionCard, trackingType === 'numeric' && styles.trackingOptionCardSelected]}
                  onPress={() => setTrackingType('numeric')}
                >
                  <Hash size={24} color={trackingType === 'numeric' ? Colors.primary : Colors.textSecondary} />
                  <View style={styles.trackingOptionTextContainer}>
                    <Text style={styles.trackingOptionTitle}>Numeric Value</Text>
                    <Text style={styles.trackingOptionDescription}>Track a specific number</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.trackingOptionCard, trackingType === 'time' && styles.trackingOptionCardSelected]}
                  onPress={() => setTrackingType('time')}
                >
                  <Clock size={24} color={trackingType === 'time' ? Colors.primary : Colors.textSecondary} />
                  <View style={styles.trackingOptionTextContainer}>
                    <Text style={styles.trackingOptionTitle}>Time Tracking</Text>
                    <Text style={styles.trackingOptionDescription}>Track duration</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {trackingType === 'numeric' && (
                <View style={styles.rowInputs}>
                   <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Target</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 10"
                       keyboardType="numeric"
                      value={targetValue}
                      onChangeText={setTargetValue}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Unit</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., pages"
                      value={unit}
                      onChangeText={setUnit}
                    />
                  </View>
                </View>
              )}

              {trackingType === 'time' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Target Duration (minutes)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 30"
                    keyboardType="numeric"
                    value={targetValue}
                    onChangeText={setTargetValue}
                  />
                </View>
              )}
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepHeaderTitle}>Frequency</Text>
              <Text style={styles.stepTitle}>How often?</Text>

              <View style={styles.segmentControl}>
                <TouchableOpacity
                  style={[styles.segmentButton, frequency === 'daily' && styles.segmentButtonActive]}
                  onPress={() => setFrequency('daily')}
                >
                  <Text style={[styles.segmentText, frequency === 'daily' && styles.segmentTextActive]}>Daily</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentButton, frequency === 'weekly' && styles.segmentButtonActive]}
                  onPress={() => setFrequency('weekly')}
                >
                  <Text style={[styles.segmentText, frequency === 'weekly' && styles.segmentTextActive]}>Weekly</Text>
                </TouchableOpacity>
              </View>

              {frequency === 'weekly' && (
                <View style={styles.weekDaysContainer}>
                  <Text style={styles.weekDaysLabel}>Select days:</Text>
                  <View style={styles.weekDaysRow}>
                    {DAYS.map((day) => {
                       const isSelected = weekDays.includes(day.value);
                       return (
                        <TouchableOpacity
                          key={day.value}
                          style={[styles.weekDayButton, isSelected && styles.weekDayButtonSelected]}
                          onPress={() => toggleWeekDay(day.value)}
                        >
                          <Text style={[styles.weekDayText, isSelected && styles.weekDayTextSelected]}>
                            {day.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          )}

          {step === 4 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepHeaderTitle}>Life Area</Text>
              <Text style={styles.stepTitle}>Which life area does this link to?</Text>

              {LIFE_AREA_ORDER.map((lifeArea) => {
                const config = LIFE_AREA_OPTIONS[lifeArea];
                const isSelected = selectedLifeArea === lifeArea;
                
                return (
                  <TouchableOpacity
                    key={lifeArea}
                    testID={`habit-life-area-${lifeArea}`}
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                      isSelected && { borderColor: config.color, backgroundColor: `${config.color}15` },
                    ]}
                    onPress={() => setSelectedLifeArea(lifeArea)}
                  >
                    <View style={[styles.lifeAreaIconWrapper, { backgroundColor: `${config.color}20` }]}>
                      <config.Icon size={24} color={config.color} />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, isSelected && { color: config.color }]}>{config.label}</Text>
                    </View>
                    {isSelected && <Check size={20} color={config.color} />}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                testID="habit-life-area-none"
                style={[styles.optionCard, !selectedLifeArea && styles.optionCardSelected]}
                onPress={() => setSelectedLifeArea(undefined)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>None</Text>
                </View>
                {!selectedLifeArea && <Check size={20} color={Colors.primary} />}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          {step < 4 ? (
            <TouchableOpacity
              style={[styles.nextButton, !canProceed() && styles.buttonDisabled]}
              onPress={handleNext}
              disabled={!canProceed()}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextButton, !canProceed() && styles.buttonDisabled]}
              onPress={handleComplete}
              disabled={!canProceed()}
            >
              <Text style={styles.nextButtonText}>Create Habit</Text>
            </TouchableOpacity>
          )}
        </View>
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
  stepHeaderTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
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
  stepTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 24,
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
  textDisabled: {
    color: Colors.textSecondary,
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
  inputGroup: {
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
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
  lifeAreaIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
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
  weekDaysContainer: {
    gap: 12,
  },
  weekDaysLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
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
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
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
    marginBottom: 24,
  },
  trackingOptionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  trackingOptionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  trackingOptionTextContainer: {
    flex: 1,
  },
  trackingOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  trackingOptionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
});
