export type MoodType = 'great' | 'fine' | 'neutral' | 'stressed' | 'low';

export type CheckInType = 'morning' | 'midday' | 'evening';

export interface DailyCheckIn {
  id: string;
  date: string;
  type: CheckInType;
  mood: MoodType;
  reflection?: string;
  createdAt: string;
}

export interface ReflectionInsightsData {
  life_areas: string[];
  goal_alignment: string[];
  emotions: string[];
  wins: string[];
  energizers: string[];
  drainers: string[];
}

export interface JournalEntry {
  id: string;
  content: string;
  createdAt: string;
  analyzed: boolean;
  extractedTodos?: string[];
  extractedHabits?: string[];
  extractedGoals?: string[];
  reflectionInsights?: ReflectionInsightsData;
  mood?: MoodType;
  tags?: string[];
  linkedGoalId?: string;
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  group?: 'now' | 'later';
  order?: number;
  createdAt: string;
  completedAt?: string;
  fromJournalId?: string;
}

export interface GoalTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  goalId: string;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
}

export type HabitTrackingType = 'checkbox' | 'numeric' | 'time';

export interface Habit {
  id: string;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly';
  weekDays?: number[];
  trackingType: HabitTrackingType;
  targetValue?: number;
  unit?: string;
  completedDates: string[];
  trackingData?: { [date: string]: number };
  createdAt: string;
  fromJournalId?: string;
  goalId?: string;
  aspirationId?: string;
  lifeArea?: LifeArea;
}

export type GoalStatus = 'active' | 'archived' | 'completed';

export interface Goal {
  id: string;
  title: string;
  why?: string;
  successCriteria?: string;
  targetDate?: string;
  goalTaskIds?: string[];
  habitIds?: string[];
  createdAt: string;
  completedAt?: string;
  fromJournalId?: string;
  aspirationId?: string;
  aspirationIds?: string[];
  lifeArea?: LifeArea;
  isFocusGoal?: boolean;
  status?: GoalStatus;
}



export interface UserProgress {
  xp: number;
  level: number;
}

export interface UserProfile {
  name?: string;
  ageGroup?: '18-24' | '25-34' | '35-44' | '45-54' | '55+' | 'prefer-not-to-say';
  gender?: 'female' | 'male' | 'non-binary' | 'prefer-not-to-say';
  interests?: string[];
  goals?: string[];
  identityTags?: string[];
  lifeAreaRanking?: ('relationship' | 'career' | 'health' | 'finance' | 'growth')[];
  onboardingCompleted?: boolean;
}

export type LifeArea = 'relationship' | 'career' | 'health' | 'finance' | 'growth';

export interface Vision {
  text: string;
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VisionGuideResponse {
  id: string;
  question: string;
  answer: string;
  feedback?: string;
  updatedAt: string;
}

export interface VisionGuideSession {
  responses: VisionGuideResponse[];
  synthesizedVision?: string;
  pendingVision?: string;
  lastUpdated?: string;
}

export interface Aspiration {
  id: string;
  lifeArea: LifeArea;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  journalEntries: JournalEntry[];
  dailyCheckIns: DailyCheckIn[];
  todos: Todo[];
  goalTasks: GoalTask[];
  habits: Habit[];
  goals: Goal[];
  userProgress: UserProgress;
  userProfile?: UserProfile;
  vision?: Vision;
  visionGuideSession?: VisionGuideSession;
  aspirations: Aspiration[];
  focusGoalId?: string;
  focusGoalSelectionMode: 'auto' | 'manual';
}
