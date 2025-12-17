import type { Aspiration, Goal, Habit, LifeArea } from '../types';

const LIFE_AREA_VALUES: LifeArea[] = ['relationship', 'career', 'health', 'finance', 'growth'];
const LIFE_AREA_SET = new Set<LifeArea>(LIFE_AREA_VALUES);

const normalizeLifeAreaToken = (token?: string): LifeArea | undefined => {
  if (!token) return undefined;
  const normalized = token.startsWith('temp-') ? token.replace('temp-', '') : token;
  return LIFE_AREA_SET.has(normalized as LifeArea) ? (normalized as LifeArea) : undefined;
};

export const resolveGoalLifeArea = (
  goal: Goal | undefined,
  aspirations: Aspiration[],
): LifeArea | undefined => {
  if (!goal) return undefined;
  if (goal.lifeArea) return goal.lifeArea;

  if (goal.aspirationId) {
    const direct = aspirations.find(a => a.id === goal.aspirationId);
    if (direct) return direct.lifeArea;
    const parsed = normalizeLifeAreaToken(goal.aspirationId);
    if (parsed) return parsed;
  }

  if (goal.aspirationIds && goal.aspirationIds.length > 0) {
    for (const id of goal.aspirationIds) {
      const direct = aspirations.find(a => a.id === id);
      if (direct) return direct.lifeArea;
      const parsed = normalizeLifeAreaToken(id);
      if (parsed) return parsed;
    }
  }

  return undefined;
};

export const resolveHabitLifeArea = (
  habit: Habit,
  state: { aspirations: Aspiration[]; goals: Goal[] },
): LifeArea | undefined => {
  if (habit.lifeArea) return habit.lifeArea;

  if (habit.aspirationId) {
    const direct = state.aspirations.find(a => a.id === habit.aspirationId);
    if (direct) return direct.lifeArea;
    const parsed = normalizeLifeAreaToken(habit.aspirationId);
    if (parsed) return parsed;
  }

  if (habit.goalId) {
    const goal = state.goals.find(g => g.id === habit.goalId);
    return resolveGoalLifeArea(goal, state.aspirations);
  }

  return undefined;
};

export const getLifeAreaLabel = (lifeArea?: LifeArea): string | undefined => {
  if (!lifeArea) return undefined;
  return lifeArea === 'growth'
    ? 'Growth'
    : lifeArea.charAt(0).toUpperCase() + lifeArea.slice(1);
};
