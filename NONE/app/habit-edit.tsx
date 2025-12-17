import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, CheckCircle2, Hash, Clock, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useAppState } from '../contexts/AppStateContext';
import Colors from '../constants/colors';
import ConfirmationModal from '../components/ConfirmationModal';
import type { HabitTrackingType } from '../types';

export default function HabitEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { state, updateHabit, deleteHabit } = useAppState();

  const habit = state.habits.find(h => h.id === id);

  const [title, setTitle] = useState(habit?.title || '');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>(habit?.frequency || 'daily');
  const [weekDays, setWeekDays] = useState<number[]>(habit?.weekDays || []);
  const [trackingType, setTrackingType] = useState<HabitTrackingType>(habit?.trackingType || 'checkbox');
  const [targetValue, setTargetValue] = useState<number | undefined>(habit?.targetValue);
  const [unit, setUnit] = useState<string | undefined>(habit?.unit);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const handleSave = () => {
    if (typeof id === 'string') {
      updateHabit(id, {
        title,
        frequency,
        weekDays: frequency === 'weekly' ? weekDays : undefined,
        trackingType,
        targetValue,
        unit,
      });
      router.back();
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleDelete = () => {
    if (!habit) {
      return;
    }
    setIsDeleteModalVisible(true);
  };

  const handleConfirmDelete = () => {
    if (typeof id !== 'string') {
      return;
    }
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    deleteHabit(id);
    setIsDeleteModalVisible(false);
    router.back();
  };

  const handleCancelDelete = () => {
    setIsDeleteModalVisible(false);
  };

  if (!habit) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
         <Text style={{ textAlign: 'center', marginTop: 20, color: Colors.text }}>Habit not found</Text>
         <TouchableOpacity onPress={handleBack} style={{ alignSelf: 'center', marginTop: 20 }}>
            <Text style={{ color: Colors.primary }}>Go Back</Text>
         </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <View style={styles.header}>
           <Text style={styles.headerTitle}>Edit Habit</Text>
           <TouchableOpacity onPress={handleBack}>
             <X size={24} color={Colors.textSecondary} />
           </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Habit Name</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Frequency</Text>
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
          </View>

          {frequency === 'weekly' && (
             <View style={styles.weekDaysContainer}>
              <Text style={styles.weekDaysLabel}>Select days:</Text>
              <View style={styles.weekDaysRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
                  const isSelected = weekDays.includes(index);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.weekDayButton, isSelected && styles.weekDayButtonSelected]}
                      onPress={() => {
                        const newWeekDays = isSelected
                          ? weekDays.filter(d => d !== index)
                          : [...weekDays, index];
                        setWeekDays(newWeekDays);
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
                  style={[styles.trackingOptionCard, trackingType === 'checkbox' && styles.trackingOptionCardSelected]}
                  onPress={() => setTrackingType('checkbox')}
                >
                  <CheckCircle2 size={20} color={trackingType === 'checkbox' ? Colors.primary : Colors.textSecondary} />
                  <View style={styles.trackingOptionTextContainer}>
                    <Text style={styles.trackingOptionTitle}>Done / Not Done</Text>
                    <Text style={styles.trackingOptionDescription}>Simple checkbox</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.trackingOptionCard, trackingType === 'numeric' && styles.trackingOptionCardSelected]}
                  onPress={() => setTrackingType('numeric')}
                >
                  <Hash size={20} color={trackingType === 'numeric' ? Colors.primary : Colors.textSecondary} />
                  <View style={styles.trackingOptionTextContainer}>
                     <Text style={styles.trackingOptionTitle}>Numeric Value</Text>
                     <Text style={styles.trackingOptionDescription}>Track pages, cups, etc.</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.trackingOptionCard, trackingType === 'time' && styles.trackingOptionCardSelected]}
                  onPress={() => setTrackingType('time')}
                >
                  <Clock size={20} color={trackingType === 'time' ? Colors.primary : Colors.textSecondary} />
                   <View style={styles.trackingOptionTextContainer}>
                     <Text style={styles.trackingOptionTitle}>Time Spent</Text>
                     <Text style={styles.trackingOptionDescription}>Track duration</Text>
                  </View>
                </TouchableOpacity>
             </View>
          </View>

          {trackingType === 'numeric' && (
            <View style={styles.rowInputs}>
               <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Target</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 10"
                   keyboardType="numeric"
                  value={targetValue?.toString() ?? ''}
                  onChangeText={(text) => setTargetValue(text === '' ? undefined : Number(text))}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Unit</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., pages"
                  value={unit ?? ''}
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
                  value={targetValue?.toString() ?? ''}
                  onChangeText={(text) => setTargetValue(text === '' ? undefined : Number(text))}
                />
              </View>
          )}

          <View style={{ height: 40 }} />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Trash2 size={18} color="#FF6B6B" />
            <Text style={styles.deleteButtonText}>Delete Habit</Text>
          </TouchableOpacity>
          
          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </View>

      <ConfirmationModal
        visible={isDeleteModalVisible}
        title="Delete this habit?"
        description="This will remove the habit and its completion history forever."
        confirmLabel="Delete Habit"
        cancelLabel="Keep Habit"
        tone="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        testIDPrefix="habit-delete-confirmation"
      />
    </>
  );
}

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
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  inputGroup: {
    gap: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
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
  weekDaysContainer: {
    marginTop: 16,
    gap: 12,
  },
  weekDaysLabel: {
    fontSize: 14,
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
    marginTop: 16,
  },
  trackingOptionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  deleteButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
});
