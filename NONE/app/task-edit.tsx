import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { X, Trash2 } from 'lucide-react-native';
import Colors from '../constants/colors';
import ConfirmationModal from '../components/ConfirmationModal';
import { useAppState } from '../contexts/AppStateContext';
import type { GoalTask } from '../types';

export default function TaskEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; type?: 'goal' | 'todo' }>();
  const { id, type } = params;
  const isGoalTask = type === 'goal';
  const { state, updateTodo, updateGoalTask, deleteGoalTask, deleteTodo } = useAppState();

  const task = useMemo(() => {
    if (typeof id !== 'string') return undefined;
    return isGoalTask ? state.goalTasks.find(t => t.id === id) : state.todos.find(t => t.id === id);
  }, [id, isGoalTask, state.goalTasks, state.todos]);

  const goalTask = isGoalTask && task ? (task as GoalTask) : undefined;

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [dueDate, setDueDate] = useState(goalTask?.dueDate ?? '');
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      if (goalTask) {
        setDueDate(goalTask.dueDate ?? '');
      }
    }
  }, [task, goalTask]);

  const handleBack = () => {
    router.back();
  };

  const handleSave = () => {
    if (typeof id !== 'string' || !task) return;

    if (isGoalTask) {
      updateGoalTask(id, {
        title,
        description: description.trim() ? description : undefined,
        dueDate: dueDate.trim() ? dueDate : undefined,
      });
    } else {
      updateTodo(id, {
        title,
        description: description.trim() ? description : undefined,
      });
    }

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.back();
  };

  const handleDelete = () => {
    if (!task) {
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
    if (isGoalTask) {
      deleteGoalTask(id);
    } else {
      deleteTodo(id);
    }
    setIsDeleteModalVisible(false);
    router.back();
  };

  const handleCancelDelete = () => {
    setIsDeleteModalVisible(false);
  };

  if (!task) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 32 }]}>
        <Text style={styles.emptyStateTitle}>Task not found</Text>
        <TouchableOpacity onPress={handleBack} style={styles.emptyStateButton} testID="task-edit-back-button">
          <Text style={styles.emptyStateButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>{isGoalTask ? 'Goal Task' : 'Quick Task'}</Text>
            <Text style={styles.headerTitle}>Edit Task</Text>
          </View>
          <TouchableOpacity onPress={handleBack} accessibilityRole="button" testID="task-edit-close-button">
            <X size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Update the task title"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional details"
              placeholderTextColor={Colors.textSecondary}
              multiline
            />
          </View>

          {isGoalTask && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Due Date</Text>
              <TextInput
                style={styles.input}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveButton, !title.trim() && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!title.trim()}
            testID="task-edit-save-button"
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} testID="task-edit-delete-button">
            <Trash2 size={18} color="#FF6B6B" />
            <Text style={styles.deleteButtonText}>Delete Task</Text>
          </TouchableOpacity>

          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
      </View>

      <ConfirmationModal
        visible={isDeleteModalVisible}
        title="Delete this task?"
        description="This will permanently remove the task and its progress."
        confirmLabel="Delete Task"
        cancelLabel="Keep Task"
        tone="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        testIDPrefix="task-delete-confirmation"
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 15,
    color: Colors.text,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButtonText: {
    color: '#FF6B6B',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyStateTitle: {
    textAlign: 'center',
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  emptyStateButton: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  emptyStateButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
});
