import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Check,
  CheckCircle2,
  Plus,
} from 'lucide-react-native';
import Colors from '../constants/colors';
import type { ReflectionInsightsData } from '../types';

interface ReflectionInsightsContentProps {
  reflectionData: {
    tasks: string[];
    habits: string[];
    goals: string[];
  };
  insights: ReflectionInsightsData;
  hasActiveGoals: boolean;
  interactiveActions?: boolean;
  selectedTasks?: Set<string>;
  onToggleTaskSelection?: (taskTitle: string) => void;
  onHabitAction?: (habitTitle: string) => void;
  onGoalAction?: (goalTitle: string) => void;
  isHabitAlreadyPlanned?: (habitTitle: string) => boolean;
  isGoalAlreadyPlanned?: (goalTitle: string) => boolean;
}

export default function ReflectionInsightsContent({
  reflectionData,
  insights,
  hasActiveGoals,
  interactiveActions = true,
  selectedTasks,
  onToggleTaskSelection,
  onHabitAction,
  onGoalAction,
  isHabitAlreadyPlanned,
  isGoalAlreadyPlanned,
}: ReflectionInsightsContentProps) {
  const hasDetectedActions = useMemo(() => {
    return (
      reflectionData.tasks.length > 0 ||
      reflectionData.habits.length > 0 ||
      reflectionData.goals.length > 0
    );
  }, [reflectionData.goals.length, reflectionData.habits.length, reflectionData.tasks.length]);

  const selectedTasksSet = selectedTasks ?? new Set<string>();
  const canSelectTasks = interactiveActions && typeof onToggleTaskSelection === 'function';
  const canCreateHabit = interactiveActions && typeof onHabitAction === 'function';
  const canCreateGoal = interactiveActions && typeof onGoalAction === 'function';

  return (
    <View style={styles.wrapper} testID="reflection-insights-wrapper">
      <View style={styles.actionsHeader}>
        <Text style={styles.cardHeading}>Actions</Text>
        <Text style={styles.cardSubtitle}>
          Based on your reflection, here are some suggested actions:
        </Text>
      </View>

      {hasDetectedActions ? (
        <View style={styles.actionsWrapper} testID="reflection-actions-card">
          {reflectionData.tasks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tasks</Text>
              {reflectionData.tasks.map(task => {
                const isSelected = selectedTasksSet.has(task);
                return (
                  <View key={task} style={styles.itemCard}>
                    <View style={styles.itemContent}>
                      <CheckCircle2 size={20} color={Colors.primary} />
                      <Text style={styles.itemText}>{task}</Text>
                    </View>
                    {canSelectTasks ? (
                      <TouchableOpacity
                        onPress={() => onToggleTaskSelection(task)}
                        style={[styles.addButton, isSelected && styles.addButtonSelected]}
                        activeOpacity={0.9}
                        testID={`task-toggle-${task}`}
                      >
                        {isSelected ? (
                          <Check size={18} color={Colors.surface} />
                        ) : (
                          <Plus size={18} color={Colors.surface} />
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          {reflectionData.habits.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Habits</Text>
              {reflectionData.habits.map(habit => {
                const isAlreadyInPlan = isHabitAlreadyPlanned?.(habit) ?? false;
                return (
                  <View key={habit} style={styles.itemCard}>
                    <View style={styles.itemContent}>
                      <CheckCircle2 size={20} color={Colors.accent} />
                      <Text style={styles.itemText}>{habit}</Text>
                    </View>
                    {canCreateHabit ? (
                      <TouchableOpacity
                        onPress={() => onHabitAction(habit)}
                        style={[styles.addButton, isAlreadyInPlan && styles.addButtonSelected]}
                        activeOpacity={0.9}
                        testID={`habit-action-${habit}`}
                      >
                        {isAlreadyInPlan ? (
                          <Check size={18} color={Colors.surface} />
                        ) : (
                          <Plus size={18} color={Colors.surface} />
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          {reflectionData.goals.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Goals</Text>
              {reflectionData.goals.map(goal => {
                const isAlreadyInPlan = isGoalAlreadyPlanned?.(goal) ?? false;
                return (
                  <View key={goal} style={styles.itemCard}>
                    <View style={styles.itemContent}>
                      <CheckCircle2 size={20} color={Colors.warning} />
                      <Text style={styles.itemText}>{goal}</Text>
                    </View>
                    {canCreateGoal ? (
                      <TouchableOpacity
                        onPress={() => onGoalAction(goal)}
                        style={[styles.addButton, isAlreadyInPlan && styles.addButtonSelected]}
                        activeOpacity={0.9}
                        testID={`goal-action-${goal}`}
                      >
                        {isAlreadyInPlan ? (
                          <Check size={18} color={Colors.surface} />
                        ) : (
                          <Plus size={18} color={Colors.surface} />
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyActionsCard} testID="reflection-actions-empty">
          <Text style={styles.emptyActionsTitle}>No actions detected</Text>
          <Text style={styles.emptyActionsText}>
            We saved your thought. Try adding a bit more detail if you want suggestions next time.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 16,
  },
  actionsHeader: {
    marginBottom: 12,
  },
  cardHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 22,
  },
  actionsWrapper: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    marginBottom: 12,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  emptyActionsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  emptyActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  emptyActionsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemText: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonSelected: {
    backgroundColor: Colors.accent,
  },
});
