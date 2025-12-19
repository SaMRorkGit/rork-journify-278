import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { generateText } from '@rork-ai/toolkit-sdk';
import DeeperInsights from '../../components/DeeperInsights';
import { useAppState } from '../../contexts/AppStateContext';
import Colors from '../../constants/colors';
import { resolveGoalLifeArea, resolveHabitLifeArea, getLifeAreaLabel } from '../../constants/life-area-helpers';
import type { AppState, Goal, JournalEntry, LifeArea, MoodType, ReflectionInsightsData } from '../../types';

type WeekRange = { start: Date; end: Date };
type WeekDayInfo = { date: Date; key: string; shortLabel: string; dayNumber: string };

type MoodCountKey = MoodType;

const moodDisplayOrder: { key: MoodCountKey; label: string; emoji: string }[] = [
  { key: 'great', label: 'Great', emoji: '😄' },
  { key: 'fine', label: 'Fine', emoji: '🙂' },
  { key: 'neutral', label: 'Neutral', emoji: '😐' },
  { key: 'stressed', label: 'Stressed', emoji: '😣' },
  { key: 'low', label: 'Sad', emoji: '😢' },
];

type WeeklyMetrics = {
  dayStatuses: Record<string, boolean>;
  shownDaysCount: number;
  checkInsCount: number;
  reflectionsCount: number;
  tasksDoneCount: number;
  activeHabitCount: number;
  goalsAchievedCount: number;
  moodCounts: Record<MoodCountKey, number>;
};

type LifeAreaTheme = {
  area: LifeArea;
  label: string;
  highlights: string[];
};

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useAppState();
  const [weekOffset, setWeekOffset] = useState(0);
  const [themesCardWidth, setThemesCardWidth] = useState(0);

  const weekRange = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const weekDays = useMemo(() => getWeekDays(weekRange.start), [weekRange.start]);
  const weeklyMetrics = useMemo(() => calculateWeeklyMetrics(state, weekRange, weekDays), [state, weekRange, weekDays]);
  const weekRangeLabel = useMemo(() => formatWeekRangeLabel(weekRange.start, weekRange.end), [weekRange]);
  const themeExtractionSnapshot = useMemo(() => buildThemeExtractionSnapshot(state, weekRange), [state, weekRange]);
  const themeSnapshotSerialized = themeExtractionSnapshot.serialized;
  const themeSnapshotKey = themeExtractionSnapshot.cacheKey;
  const shouldGenerateAiThemes = themeExtractionSnapshot.hasSignals;
  const fallbackLifeAreaThemes = useMemo(() => deriveLifeAreaThemes(state), [state]);

  const activeGoals = useMemo(
    () => state.goals.filter(goal => !goal.completedAt && goal.status !== 'archived'),
    [state.goals]
  );
  const activeGoalTitles = useMemo(
    () => activeGoals.map(goal => goal.title),
    [activeGoals]
  );
  const hasActiveGoals = activeGoals.length > 0;

  const { data: deeperInsightsData } = useQuery<ReflectionInsightsData>({
    queryKey: ['weekly-deeper-insights', themeSnapshotKey, activeGoalTitles.length, themeSnapshotSerialized],
    queryFn: async () => {
      console.log('[Insights] Requesting AI-powered deeper insights');
      const goalContext = activeGoalTitles.length > 0
        ? `Active goals: ${activeGoalTitles.join(', ')}.`
        : 'The user currently has no active goals.';
      
      const prompt = `${REFLECTION_INSIGHTS_GUIDANCE}

IMPORTANT: You are analyzing a WHOLE WEEK of journal entries, check-ins, and actions.
Aggregate the insights to represent the week as a whole.
Focus on the "insights" object in the response. You can return empty arrays for tasks, habits, and goals as we are focused on reflection insights here.

Goal alignment context: ${goalContext}

Weekly Data:
${themeSnapshotSerialized}`;

      const response = await generateText({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
      });

      const extracted = extractJsonBlock(response);
      const parsed = JSON.parse(extracted) as {
        insights?: Partial<ReflectionInsightsData>;
      };
      
      return {
        life_areas: Array.isArray(parsed.insights?.life_areas) ? parsed.insights?.life_areas! : [],
        goal_alignment: Array.isArray(parsed.insights?.goal_alignment) ? parsed.insights?.goal_alignment! : [],
        emotions: Array.isArray(parsed.insights?.emotions) ? parsed.insights?.emotions! : [],
        wins: Array.isArray(parsed.insights?.wins) ? parsed.insights?.wins! : [],
        energizers: Array.isArray(parsed.insights?.energizers) ? parsed.insights?.energizers! : [],
        drainers: Array.isArray(parsed.insights?.drainers) ? parsed.insights?.drainers! : [],
      };
    },
    enabled: shouldGenerateAiThemes,
    staleTime: 1000 * 60 * 60,
  });

  const {
    data: weeklySummaryContent,
    isFetching: isWeeklySummaryFetching,
    isError: isWeeklySummaryError,
    refetch: refetchWeeklySummary,
  } = useQuery<string>({
    queryKey: ['insights-weekly-summary', themeSnapshotKey, themeSnapshotSerialized],
    queryFn: async () => {
      console.log('[Insights] Requesting weekly insight summary');
      const prompt = `${WEEKLY_INSIGHT_PROMPT}

User week data snapshot:
${themeSnapshotSerialized}`;
      const response = await generateText({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.55,
        topP: 0.9,
        presencePenalty: 0.1,
        frequencyPenalty: 0,
      });
      return response.trim();
    },
    enabled: shouldGenerateAiThemes,
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const {
    data: aiThemesData,
    isFetching: isThemesFetching,
    isRefetching: isThemesRefetching,
    isError: isThemesError,
    refetch: refetchThemes,
  } = useQuery<LifeAreaTheme[]>({
    queryKey: ['insights-life-area-themes', themeSnapshotKey, themeSnapshotSerialized],
    queryFn: async () => {
      console.log('[Insights] Requesting AI-powered life area themes');
      const response = await generateText({
        messages: [
          {
            role: 'user',
            content: `${THEME_EXTRACTION_PROMPT}\n\nUser activity data:\n${themeSnapshotSerialized}`,
          },
        ],
        temperature: 0.35,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0,
      });
      return parseAiThemesResponse(response);
    },
    enabled: shouldGenerateAiThemes,
    staleTime: 1000 * 60 * 30,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const aiThemes = aiThemesData ?? [];
  const lifeAreaThemes = aiThemes.length > 0 ? aiThemes : fallbackLifeAreaThemes;
  const themesLoading = shouldGenerateAiThemes && (isThemesFetching || isThemesRefetching);
  const themeError = shouldGenerateAiThemes && isThemesError;
  const showThemesSection = themesLoading || themeError || lifeAreaThemes.length > 0;

  const themesPerRow = useMemo(() => {
    if (themesCardWidth === 0 || lifeAreaThemes.length === 0) {
      return 1;
    }
    if (themesCardWidth >= 760) {
      return Math.min(4, lifeAreaThemes.length);
    }
    if (themesCardWidth >= 520) {
      return Math.min(3, lifeAreaThemes.length);
    }
    return Math.min(2, lifeAreaThemes.length);
  }, [themesCardWidth, lifeAreaThemes.length]);
  const themeColumnWidth = useMemo(() => {
    if (themesCardWidth === 0) {
      return undefined;
    }
    const horizontalPadding = 24; // themes card has 12px padding on each side
    const usableWidth = themesCardWidth - horizontalPadding;
    const gap = 12;
    const columns = Math.max(1, themesPerRow);
    const totalGap = gap * (columns - 1);
    const width = (usableWidth - totalGap) / columns;
    return width > 140 ? width : 140;
  }, [themesCardWidth, themesPerRow]);
  const canGoForward = weekOffset < 0;
  const hasActivityThisWeek = weeklyMetrics.shownDaysCount > 0;

  const statItems = useMemo(
    () => [
      { key: 'checkins', label: 'Check-ins', value: weeklyMetrics.checkInsCount },
      { key: 'reflections', label: 'Reflections', value: weeklyMetrics.reflectionsCount },
      { key: 'tasks', label: 'Tasks Done', value: weeklyMetrics.tasksDoneCount },
      { key: 'habits', label: 'Active Habits', value: weeklyMetrics.activeHabitCount },
    ],
    [weeklyMetrics]
  );

  const moodItems = useMemo(
    () =>
      moodDisplayOrder.map(item => ({
        ...item,
        value: weeklyMetrics.moodCounts[item.key] ?? 0,
      })),
    [weeklyMetrics.moodCounts]
  );

  const weeklySummaryText = weeklySummaryContent?.trim() ?? '';
  const weeklySummaryParagraph = (() => {
    if (!hasActivityThisWeek) {
      return 'No activity captured yet this week. Share a check-in or reflection to unlock a gentle summary.';
    }
    if (shouldGenerateAiThemes) {
      if (isWeeklySummaryFetching) {
        return 'Gathering a warm overview of your week—this may take a moment.';
      }
      if (weeklySummaryText.length > 0) {
        return weeklySummaryText;
      }
      if (isWeeklySummaryError) {
        return 'We couldn\'t refresh your weekly insight just now.';
      }
    }
    return 'Your weekly insight will appear once there\'s enough activity to reflect on.';
  })();
  const showWeeklySummaryRetry = shouldGenerateAiThemes && isWeeklySummaryError;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Ionicons name="bulb-outline" size={32} color={Colors.primary} />
          <Text style={styles.headerTitle}>Insights</Text>
          <Text style={styles.headerSubtitle}>Your growth journey</Text>
        </View>

        <View style={styles.weekNavigator}>
          <TouchableOpacity
            style={styles.weekNavButton}
            activeOpacity={0.8}
            onPress={() => {
              console.log('[Insights] Navigating to previous week');
              setWeekOffset(prev => prev - 1);
            }}
            testID="week-nav-prev"
          >
            <Ionicons name="chevron-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.weekNavigatorLabel}>
            <Text style={styles.weekRangeText}>{weekRangeLabel}</Text>
          </View>
          <TouchableOpacity
            style={[styles.weekNavButton, !canGoForward && styles.weekNavButtonDisabled]}
            activeOpacity={0.8}
            onPress={() => {
              if (canGoForward) {
                console.log('[Insights] Navigating forward a week');
                setWeekOffset(prev => Math.min(prev + 1, 0));
              }
            }}
            disabled={!canGoForward}
            testID="week-nav-next"
          >
            <Ionicons name="chevron-forward" size={20} color={canGoForward ? Colors.text : Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Summary</Text>
          <View style={styles.weeklySummaryCard} testID="weekly-summary-card">
            <View style={styles.weeklySummaryHeaderRow}>
              <Text style={styles.weeklySummaryHeadline}>
                {hasActivityThisWeek ? 'Your Week So Far' : 'No activity yet'}
              </Text>
              {shouldGenerateAiThemes && isWeeklySummaryFetching ? (
                <View style={styles.weeklySummarySpinner} testID="weekly-summary-loading">
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              ) : null}
            </View>
            <Text style={styles.weeklySummaryBody} testID="weekly-summary-text">
              {weeklySummaryParagraph}
            </Text>
            {showWeeklySummaryRetry ? (
              <TouchableOpacity
                style={styles.weeklySummaryRetryButton}
                activeOpacity={0.85}
                onPress={() => {
                  console.log('[Insights] Retrying weekly insight summary');
                  refetchWeeklySummary();
                }}
                testID="weekly-summary-retry-button"
              >
                <Text style={styles.weeklySummaryRetryText}>Tap to refresh your summary</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>



        {hasActivityThisWeek && (
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              {statItems.map(item => (
                <View
                  key={item.key}
                  style={styles.statItem}
                  testID={`weekly-stat-${item.key}`}
                >
                  <Text style={styles.statValue}>{item.value}</Text>
                  <Text style={styles.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {hasActivityThisWeek && (
          <View style={styles.moodCard}>
            <Text style={styles.sectionTitle}>Weekly Mood Mix</Text>
            <View style={styles.moodRow}>
              {moodItems.map(item => (
                <View key={item.key} style={styles.moodItem} testID={`weekly-mood-${item.key}`}>
                  <Text style={styles.moodValue}>{item.value}</Text>
                  <Text style={styles.moodEmoji}>{item.emoji}</Text>
                  <Text style={styles.moodLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {shouldGenerateAiThemes && deeperInsightsData && (
          <View style={styles.section}>
            <DeeperInsights
              insights={deeperInsightsData}
              hasActiveGoals={hasActiveGoals}
            />
          </View>
        )}

        {showThemesSection && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Themes</Text>
            <View
              style={styles.themesCardContainer}
              onLayout={({ nativeEvent }) => {
                const width = nativeEvent.layout.width;
                setThemesCardWidth(prev => (Math.abs(prev - width) < 1 ? prev : width));
              }}
            >
              {(themesLoading || themeError) && (
                <View style={styles.themesStatusWrapper}>
                  {themesLoading && (
                    <View style={styles.themesStatusRow} testID="themes-loading">
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text style={styles.themesStatusText}>Summarizing your recent activity across life areas…</Text>
                    </View>
                  )}
                  {themeError && (
                    <TouchableOpacity
                      style={styles.themesStatusRow}
                      activeOpacity={0.8}
                      onPress={() => {
                        console.log('[Insights] Retrying AI theme extraction');
                        refetchThemes();
                      }}
                      testID="themes-retry-button"
                    >
                      <Text style={[styles.themesStatusText, styles.themesErrorText]}>Couldn&apos;t refresh AI themes. Tap to retry.</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {lifeAreaThemes.length > 0 && (
                <View style={styles.themesRow} testID="themes-horizontal-scroll">
                  {lifeAreaThemes.map(theme => (
                    <View
                      key={theme.area}
                      style={[styles.themeColumn, themeColumnWidth ? { width: themeColumnWidth } : null]}
                      testID={`life-area-theme-${theme.area}`}
                    >
                      <Text style={styles.themeLabel}>{theme.label}</Text>
                      {theme.highlights.map((highlight, index) => (
                        <Text key={`${theme.area}-highlight-${index}`} style={styles.themeItem}>
                          {highlight}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.weeklyCard}>
          <Text style={styles.weeklyCardSubtitle}>Ready to set next week&rsquo;s focus?</Text>
          <TouchableOpacity
            testID="weekly-planning-button"
            style={styles.weeklyCardButton}
            activeOpacity={0.8}
            onPress={() => {
              console.log('Navigating to weekly planning flow');
              router.push('/weekly-planning' as any);
            }}
          >
            <Text style={styles.weeklyCardButtonLabel}>Plan Next Week</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  weekNavigator: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  weekNavButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  weekNavButtonDisabled: {
    opacity: 0.5,
  },
  weekNavigatorLabel: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 2,
  },
  weekRangeText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    marginHorizontal: 16,
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row' as const,
    alignItems: 'stretch' as const,
  },
  statItem: {
    flex: 1,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 4,
  },
  weeklyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  weeklyCardHeaderRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  weeklyCardTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  weeklyCardSubtitle: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  weeklyCardButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  weeklyCardButtonLabel: {
    color: Colors.primary,
    fontWeight: '700' as const,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    fontWeight: '500' as const,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  weeklySummaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  weeklySummaryHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
  },
  weeklySummaryHeadline: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  weeklySummarySpinner: {
    width: 24,
    height: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  weeklySummaryBody: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  weeklySummaryRetryButton: {
    alignSelf: 'flex-start' as const,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.primary + '12',
  },
  weeklySummaryRetryText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  goalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  lifeAreaLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  goalWhy: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  whyLabel: {
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  actionPreviewContainer: {
    marginTop: 12,
    gap: 6,
  },
  actionPreviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  actionPreviewText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  habitFrequencyText: {
    fontSize: 11,
    color: Colors.textSecondary,
    opacity: 0.7,
  },
  moreActionsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
    marginLeft: 22,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden' as const,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  moodCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    marginHorizontal: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
    marginBottom: 32,
  },
  moodRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'stretch' as const,
    gap: 8,
  },
  moodItem: {
    flex: 1,
    alignItems: 'center' as const,
    gap: 6,
  },
  moodValue: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  moodEmoji: {
    fontSize: 28,
  },
  moodLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  bottomSpacer: {
    height: 40,
  },
  themesCardContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  themesRow: {
    flexDirection: 'row' as const,
    alignItems: 'stretch' as const,
    gap: 12,
    flexWrap: 'wrap' as const,
  },
  themesStatusWrapper: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 8,
  },
  themesStatusRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  themesStatusText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  themesErrorText: {
    color: Colors.error,
    fontWeight: '600' as const,
  },
  themeColumn: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 8,
    flexGrow: 1,
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  themeItem: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});

const padNumber = (value: number) => value.toString().padStart(2, '0');

const getDateKey = (date: Date) => `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;

const parseDateKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const normalizeDate = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const getWeekRange = (offset: number): WeekRange => {
  const today = normalizeDate(new Date());
  const start = normalizeDate(new Date(today));
  start.setDate(start.getDate() - start.getDay() + offset * 7);
  const end = normalizeDate(new Date(start));
  end.setDate(end.getDate() + 6);
  return { start, end };
};

const getWeekDays = (start: Date): WeekDayInfo[] => {
  const days: WeekDayInfo[] = [];
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    days.push({
      date,
      key: getDateKey(date),
      shortLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: date.getDate().toString().padStart(2, '0'),
    });
  }
  return days;
};

const formatWeekRangeLabel = (start: Date, end: Date) => {
  const startOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const endOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (start.getFullYear() !== end.getFullYear()) {
    startOptions.year = 'numeric';
    endOptions.year = 'numeric';
  }
  return `${start.toLocaleDateString('en-US', startOptions)} - ${end.toLocaleDateString('en-US', endOptions)}`;
};

const isIsoWithinRange = (value: string | undefined, range: WeekRange) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= range.start && date <= range.end;
};

const isDateKeyWithinRange = (value: string | undefined, range: WeekRange) => {
  if (!value) return false;
  const date = parseDateKey(value);
  return date >= range.start && date <= range.end;
};

const calculateWeeklyMetrics = (state: AppState, range: WeekRange, daysOfWeek: WeekDayInfo[]): WeeklyMetrics => {
  const dayStatuses = daysOfWeek.reduce<Record<string, boolean>>((acc, day) => {
    acc[day.key] = false;
    return acc;
  }, {});

  const moodCounts = moodDisplayOrder.reduce<Record<MoodCountKey, number>>((acc, mood) => {
    acc[mood.key] = 0;
    return acc;
  }, {} as Record<MoodCountKey, number>);

  const incrementMood = (mood?: MoodType) => {
    if (!mood) return;
    if (moodCounts[mood] === undefined) return;
    moodCounts[mood] += 1;
  };

  const markDay = (dateKey?: string) => {
    if (!dateKey) return;
    if (dayStatuses[dateKey] === undefined) return;
    dayStatuses[dateKey] = true;
  };

  const reflectionsCount = state.journalEntries.reduce((count, entry) => {
    if (isIsoWithinRange(entry.createdAt, range)) {
      markDay(getDateKey(new Date(entry.createdAt)));
      incrementMood(entry.mood);
      return count + 1;
    }
    return count;
  }, 0);

  const tasksDoneCount = state.todos.reduce((count, todo) => {
    if (todo.completed && todo.completedAt && isIsoWithinRange(todo.completedAt, range)) {
      markDay(getDateKey(new Date(todo.completedAt)));
      return count + 1;
    }
    return count;
  }, 0) + state.goalTasks.reduce((count, task) => {
    if (task.completed && task.completedAt && isIsoWithinRange(task.completedAt, range)) {
      markDay(getDateKey(new Date(task.completedAt)));
      return count + 1;
    }
    return count;
  }, 0);

  const habitIds = new Set<string>();
  state.habits.forEach(habit => {
    habit.completedDates.forEach(dateKey => {
      if (isDateKeyWithinRange(dateKey, range)) {
        habitIds.add(habit.id);
        markDay(dateKey);
      }
    });
  });

  const checkInsCount = state.dailyCheckIns.reduce((count, checkIn) => {
    if (isDateKeyWithinRange(checkIn.date, range)) {
      markDay(checkIn.date);
      incrementMood(checkIn.mood);
      return count + 1;
    }
    return count;
  }, 0);

  const goalsAchievedCount = state.goals.reduce((count, goal) => {
    if (goal.completedAt && isIsoWithinRange(goal.completedAt, range)) {
      markDay(getDateKey(new Date(goal.completedAt)));
      return count + 1;
    }
    return count;
  }, 0);

  const shownDaysCount = Object.values(dayStatuses).filter(Boolean).length;

  return {
    dayStatuses,
    shownDaysCount,
    checkInsCount,
    reflectionsCount,
    tasksDoneCount,
    activeHabitCount: habitIds.size,
    goalsAchievedCount,
    moodCounts,
  };
};

const lifeAreaOrder: LifeArea[] = ['health', 'relationship', 'career', 'finance', 'growth'];

const lifeAreaLabels: Record<LifeArea, string> = {
  health: 'Health',
  relationship: 'Relationships',
  career: 'Career & Work',
  finance: 'Finance',
  growth: 'Personal Growth',
};

const lifeAreaKeywordMap: Record<LifeArea, string[]> = {
  health: ['health', 'wellness', 'body', 'fitness', 'exercise', 'doctor', 'energy'],
  relationship: ['relationship', 'relationships', 'partner', 'family', 'friends', 'community', 'social'],
  career: ['career', 'work', 'job', 'business', 'client', 'meeting', 'project'],
  finance: ['finance', 'money', 'budget', 'bill', 'expense', 'savings', 'investment', 'income'],
  growth: ['growth', 'learning', 'skill', 'mindset', 'self', 'therapy', 'improvement'],
};

const lifeAreaSynonyms: Record<string, LifeArea> = {
  'career/work': 'career',
  'career & work': 'career',
  'personal growth': 'growth',
  'self': 'growth',
  'relationships': 'relationship',
  'relationship': 'relationship',
  'health & wellness': 'health',
  'finance & money': 'finance',
};

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

const THEME_EXTRACTION_PROMPT = `Analyze all mood, check-ins, journal reflection, and actions taken for this week only to produce a “Themes” section for each life area. Highlight the things mentioned or actions taken for each area.
For the themes, categorize topics mentioned in the entries into these major life domains:
  - Health: Medical visits, treatments, medications, doctor appointments, medical procedures, health diagnoses, mental health therapy, wellness routines, meditation, mindfulness practices, sleep routines, managing fatigue, pain management, health monitoring, recovery activities, rehabilitation, physical therapy, exercise when done specifically for health/medical reasons, managing chronic conditions, preventive care, nutrition for health purposes, supplements, health screenings, managing symptoms, health-focused activities. Only EXCLUDE recreational sports played primarily for fun/enjoyment.
  - Relationships: Friends, romantic relationships, social interactions, dating, partnerships, Family members, family events, parenting, childcare, family planning, fertility treatments, reproductive health decisions, sperm donor selection, egg donation, IVF, pregnancy planning, family gatherings, extended family interactions, etc.
  - Career/Work: Work, professional development, job changes, achievements, workplace activities, meetings, projects, etc.
  - Finances: Money matters, investments, budgeting, financial goals, spending, saving, etc.
  - Personal Growth: Personal development, habits, mindfulness, goals, self-improvement, therapy for personal development, etc.

Return valid JSON using this schema:
{
  "themes": [
    {
      "lifeArea": "Health" | "Relationships" | "Career/Work" | "Finances" | "Personal Growth",
      "summary": "2-4 word theme title (e.g., Creative challenges)",
      "highlights": ["brief sentence about what happened", "another highlight"]
    }
  ]
}
Rules:
- Theme summaries must be ultra short (2-4 title-case words) describing the core takeaway (e.g., "Creative challenges", "Financial responsibilities reflection").
- Each highlights array should have 1-4 concise bullets, each under 15 words, clearly describing what happened or what action was taken.
- Only include life areas that have real signals in the data.
- Summaries must be unique per life area.
- Never invent details; ground everything in the provided data.`;

const WEEKLY_INSIGHT_PROMPT = `You are Journify’s Weekly Insight Assistant.

Your task is to generate a warm, gentle, and encouraging summary of the user’s week so far.
Use all available data, including:
• Mood check-ins
• Daily reflections
• Journaling themes
• Completed actions (habits + tasks)
• Emotional patterns
• Energizers and drainers
• Any wins or meaningful moments

Your summary should help the user understand:
1. What their week generally looked and felt like
2. How they showed up (emotionally + through actions)
3. Any small wins, efforts, or meaningful steps they took
4. Their overall momentum so far
5. A gentle forward-looking encouragement

IMPORTANT:
• Never mention specific days (“On Monday…”).
• If the week is still in progress, acknowledge that with supportive tone (e.g. “You’re building steady momentum so far…”).
• If the user has not completed many actions, speak gently and normalize it (“It seems like you haven’t had as much space for action this week, and that’s completely okay.”).
• Focus on positives, effort, and emotional honesty.
• Never judge, criticize, or compare.
• Offer only soft, non-prescriptive encouragement (e.g. “Maybe a small step could feel good when you’re ready.”).
• Keep the tone calm, supportive, and identity-based.

Your final summary should be:
• 3–5 sentences
• Gentle, simple, and emotionally safe
• Never overwhelming
• Never instructional
• Never guilt-inducing

Examples of tone (do NOT reuse verbatim):
• “This week held a mix of emotions, and you showed up with honesty and care.”
• “You made small but meaningful steps, even in moments that felt heavy.”
• “It looks like you took a few actions that aligned with what matters to you, which is beautiful progress.”
• “If it feels right, a small step ahead could help you keep nurturing this momentum.”`;

type ThemeExtractionSnapshot = {
  serialized: string;
  cacheKey: string;
  hasSignals: boolean;
};

type CompletedActionSnapshot = {
  id: string;
  type: 'todo' | 'goalTask' | 'habit';
  title: string;
  detail?: string;
  completedAt?: string;
  lifeAreas: LifeArea[];
  goalTitle?: string;
};

const MAX_THEME_JOURNAL_ENTRIES = 12;
const MAX_THEME_CHECK_INS = 18;
const MAX_THEME_ACTIONS = 18;

const buildThemeExtractionSnapshot = (state: AppState, range: WeekRange): ThemeExtractionSnapshot => {
  const weeklyJournalEntries = state.journalEntries
    .filter(entry => isIsoWithinRange(entry.createdAt, range))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const weeklyCheckIns = state.dailyCheckIns
    .filter(item => isDateKeyWithinRange(item.date, range))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const journalReflections = weeklyJournalEntries
    .slice(0, MAX_THEME_JOURNAL_ENTRIES)
    .map(entry => ({
      id: entry.id,
      createdAt: entry.createdAt,
      mood: entry.mood ?? null,
      tags: entry.tags ?? [],
      linkedGoalId: entry.linkedGoalId ?? null,
      summary: formatSnippet(entry.content ?? '', 220),
      highlights: extractJournalHighlights(entry).slice(0, 4),
    }));

  const checkIns = weeklyCheckIns
    .slice(0, MAX_THEME_CHECK_INS)
    .map(item => ({
      id: item.id,
      date: item.date,
      type: item.type,
      mood: item.mood,
      reflection: item.reflection ? formatSnippet(item.reflection, 160) : undefined,
    }));

  const completedActions = buildCompletedActionsSnapshot(state)
    .filter(action => {
      if (!action.completedAt) return false;
      // Check if it matches YYYY-MM-DD format (for habits)
      if (/^\d{4}-\d{2}-\d{2}$/.test(action.completedAt)) {
        return isDateKeyWithinRange(action.completedAt, range);
      }
      // Otherwise assume ISO string
      return isIsoWithinRange(action.completedAt, range);
    })
    .slice(0, MAX_THEME_ACTIONS)
    .map(action => ({
      ...action,
      lifeAreas: action.lifeAreas.map(area => lifeAreaLabels[area] ?? getLifeAreaLabel(area) ?? area),
    }));

  const aspirations = state.aspirations.map(asp => ({
    id: asp.id,
    lifeArea: lifeAreaLabels[asp.lifeArea] ?? getLifeAreaLabel(asp.lifeArea) ?? asp.lifeArea,
    description: formatSnippet(asp.description, 160),
  }));

  const goalsInFlight = state.goals
    .filter(goal => goal.status !== 'archived')
    .slice(0, 8)
    .map(goal => ({
      id: goal.id,
      title: goal.title,
      lifeArea: goal.lifeArea ? lifeAreaLabels[goal.lifeArea] ?? getLifeAreaLabel(goal.lifeArea) ?? goal.lifeArea : undefined,
      status: goal.completedAt ? 'completed' : 'active',
    }));

  // Build mood summary from the filtered weekly data
  const currentMoodCounts = moodDisplayOrder.reduce<Record<MoodCountKey, number>>((acc, mood) => {
    acc[mood.key] = 0;
    return acc;
  }, {} as Record<MoodCountKey, number>);

  weeklyCheckIns.forEach(checkIn => {
    currentMoodCounts[checkIn.mood] += 1;
  });

  weeklyJournalEntries.forEach(entry => {
    if (entry.mood) {
      currentMoodCounts[entry.mood] += 1;
    }
  });

  const moodSummary = moodDisplayOrder.map(item => ({
    mood: item.label,
    emoji: item.emoji,
    count: currentMoodCounts[item.key]
  }));

  const payload = {
    journalReflections,
    checkIns,
    completedActions,
    moodSummary,
    aspirations,
    goalsInFlight,
  };

  const serialized = JSON.stringify(payload, null, 2);
  const hasSignals = journalReflections.length > 0 || checkIns.length > 0 || completedActions.length > 0;

  const cacheKey = JSON.stringify({
    journal: journalReflections.map(entry => entry.id),
    checkIns: checkIns.map(item => item.id),
    actions: completedActions.map(action => action.id),
    moodSummary,
  });

  return {
    serialized,
    cacheKey,
    hasSignals,
  };
};

const buildCompletedActionsSnapshot = (state: AppState): CompletedActionSnapshot[] => {
  const goalMap = state.goals.reduce<Record<string, Goal>>((acc, goal) => {
    acc[goal.id] = goal;
    return acc;
  }, {});

  const todoRecords: CompletedActionSnapshot[] = state.todos
    .filter(todo => todo.completed && Boolean(todo.completedAt))
    .map(todo => ({
      id: todo.id,
      type: 'todo',
      title: todo.title,
      detail: todo.description ? formatSnippet(todo.description, 120) : undefined,
      completedAt: todo.completedAt,
      lifeAreas: inferLifeAreasFromText(`${todo.title} ${todo.description ?? ''}`),
    }));

  const goalTaskRecords: CompletedActionSnapshot[] = state.goalTasks
    .filter(task => task.completed && Boolean(task.completedAt))
    .map(task => {
      const goal = goalMap[task.goalId];
      const area = resolveGoalLifeArea(goal, state.aspirations);
      return {
        id: task.id,
        type: 'goalTask',
        title: task.title,
        completedAt: task.completedAt,
        goalTitle: goal?.title,
        lifeAreas: area ? [area] : [],
      };
    });

  const habitRecords: CompletedActionSnapshot[] = state.habits.flatMap(habit => {
    if (habit.completedDates.length === 0) {
      return [];
    }
    const area = resolveHabitLifeArea(habit, { aspirations: state.aspirations, goals: state.goals });
    const recentDates = [...habit.completedDates].sort().slice(-2);
    return recentDates.map(dateKey => ({
      id: `${habit.id}-${dateKey}`,
      type: 'habit',
      title: habit.title,
      completedAt: dateKey,
      detail: habit.description ? formatSnippet(habit.description, 100) : undefined,
      lifeAreas: area ? [area] : [],
    }));
  });

  return [...todoRecords, ...goalTaskRecords, ...habitRecords].sort((a, b) => getComparableTime(b.completedAt) - getComparableTime(a.completedAt));
};

const getComparableTime = (value?: string): number => {
  if (!value) return 0;
  const direct = new Date(value).getTime();
  if (!Number.isNaN(direct)) {
    return direct;
  }
  const normalized = new Date(`${value}T00:00:00`);
  return Number.isNaN(normalized.getTime()) ? 0 : normalized.getTime();
};


const extractJsonBlock = (payload: string): string => {
  const trimmed = payload.trim();
  const firstBracket = trimmed.indexOf('[');
  const firstBrace = trimmed.indexOf('{');
  if (firstBracket !== -1 && (firstBracket < firstBrace || firstBrace === -1)) {
    const lastBracket = trimmed.lastIndexOf(']');
    if (lastBracket !== -1) {
      return trimmed.slice(firstBracket, lastBracket + 1);
    }
  }
  if (firstBrace !== -1) {
    const lastBrace = trimmed.lastIndexOf('}');
    if (lastBrace !== -1) {
      return trimmed.slice(firstBrace, lastBrace + 1);
    }
  }
  return trimmed;
};

const parseAiThemesResponse = (raw: string): LifeAreaTheme[] => {
  const extracted = extractJsonBlock(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(extracted);
  } catch (error) {
    console.error('[Insights] Failed to parse AI themes response', error);
    throw error;
  }

  const themeNodes: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { themes?: unknown[] })?.themes)
      ? ((parsed as { themes?: unknown[] }).themes as unknown[])
      : [];

  const normalized = themeNodes.reduce<Record<LifeArea, LifeAreaTheme>>((acc, node) => {
    if (!node || typeof node !== 'object') {
      return acc;
    }
    const source = node as { lifeArea?: string; area?: string; domain?: string; label?: string; highlights?: unknown; items?: unknown; points?: unknown; summary?: unknown };
    const areaToken = (source.lifeArea ?? source.area ?? source.domain ?? source.label ?? '').toString();
    const area = inferLifeAreaFromToken(areaToken);
    if (!area) {
      return acc;
    }
    const highlightSource = Array.isArray(source.highlights)
      ? source.highlights
      : Array.isArray(source.items)
        ? source.items
        : Array.isArray(source.points)
          ? source.points
          : [];

    const highlights = highlightSource
      .map(item => (typeof item === 'string' ? formatSnippet(item, 120) : ''))
      .filter(Boolean);

    const summary = typeof source.summary === 'string' ? formatSnippet(source.summary, 120) : undefined;
    const combined = summary ? [summary, ...highlights] : highlights;
    const uniqueHighlights = Array.from(new Set(combined)).slice(0, 4);
    if (uniqueHighlights.length === 0) {
      return acc;
    }
    acc[area] = {
      area,
      label: lifeAreaLabels[area] ?? getLifeAreaLabel(area) ?? area,
      highlights: uniqueHighlights,
    };
    return acc;
  }, {} as Record<LifeArea, LifeAreaTheme>);

  return lifeAreaOrder
    .map(area => normalized[area])
    .filter((theme): theme is LifeAreaTheme => Boolean(theme));
};

const deriveLifeAreaThemes = (state: AppState): LifeAreaTheme[] => {
  const highlightMaps = lifeAreaOrder.reduce<Record<LifeArea, Map<string, number>>>((acc, area) => {
    acc[area] = new Map<string, number>();
    return acc;
  }, {} as Record<LifeArea, Map<string, number>>);
  const highlightOwnership = new Map<string, LifeArea>();

  const registerHighlight = (area?: LifeArea, text?: string, weight = 1) => {
    if (!area) return;
    if (!text) return;
    const formatted = formatSnippet(text);
    if (!formatted) return;
    const existingOwner = highlightOwnership.get(formatted);
    if (existingOwner && existingOwner !== area) {
      return;
    }
    const bucket = highlightMaps[area];
    const current = bucket.get(formatted) ?? 0;
    bucket.set(formatted, current + weight);
    highlightOwnership.set(formatted, area);
  };

  const goalMap = state.goals.reduce<Record<string, Goal>>((acc, goal) => {
    acc[goal.id] = goal;
    return acc;
  }, {});

  const journalMap = state.journalEntries.reduce<Record<string, JournalEntry>>((acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  }, {});

  state.goals.forEach(goal => {
    const area = resolveGoalLifeArea(goal, state.aspirations);
    registerHighlight(area, goal.title, goal.completedAt ? 4 : 3);
    if (goal.successCriteria) {
      registerHighlight(area, goal.successCriteria, 1);
    }
  });

  state.goalTasks.forEach(task => {
    if (!task.completed) return;
    const goal = goalMap[task.goalId];
    const area = resolveGoalLifeArea(goal, state.aspirations);
    registerHighlight(area, task.title, 2);
  });

  state.habits.forEach(habit => {
    const area = resolveHabitLifeArea(habit, { aspirations: state.aspirations, goals: state.goals });
    if (habit.completedDates.length > 0) {
      registerHighlight(area, habit.title, 2);
    }
  });

  state.todos.forEach(todo => {
    if (!todo.completed) return;
    const areasFromText = inferLifeAreasFromText(`${todo.title} ${todo.description ?? ''}`);
    if (areasFromText.length > 0) {
      areasFromText.forEach(area => registerHighlight(area, todo.title, 1));
      return;
    }
    if (todo.fromJournalId) {
      const entry = journalMap[todo.fromJournalId];
      if (entry) {
        const areas = getJournalEntryAreas(entry, state, goalMap);
        areas.forEach(area => registerHighlight(area, todo.title, 1));
      }
    }
  });

  state.journalEntries.forEach(entry => {
    const areas = getJournalEntryAreas(entry, state, goalMap);
    if (areas.length === 0) return;
    const highlights = extractJournalHighlights(entry);
    highlights.forEach(highlight => {
      areas.forEach(area => registerHighlight(area, highlight, 1));
    });
  });

  state.dailyCheckIns.forEach(checkIn => {
    const areas = inferLifeAreasFromText(checkIn.reflection);
    if (areas.length === 0) return;
    const moodLabel = moodDisplayOrder.find(item => item.key === checkIn.mood)?.label ?? 'Mood';
    const summary = checkIn.reflection ?? `${moodLabel} mood logged`;
    areas.forEach(area => registerHighlight(area, summary, 1));
  });

  const themes = lifeAreaOrder.map(area => {
    const highlights = Array.from(highlightMaps[area].entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([text]) => text);
    return {
      area,
      label: lifeAreaLabels[area] ?? getLifeAreaLabel(area) ?? area,
      highlights,
    };
  }).filter(theme => theme.highlights.length > 0);

  return themes;
};

const inferLifeAreasFromText = (text?: string): LifeArea[] => {
  if (!text) return [];
  const normalized = text.toLowerCase();
  const areas: LifeArea[] = [];
  lifeAreaOrder.forEach(area => {
    if (lifeAreaKeywordMap[area].some(keyword => normalized.includes(keyword))) {
      areas.push(area);
    }
  });
  return areas;
};

const inferLifeAreaFromToken = (token?: string): LifeArea | undefined => {
  if (!token) return undefined;
  const normalized = token.trim().toLowerCase();
  if (lifeAreaSynonyms[normalized]) {
    return lifeAreaSynonyms[normalized];
  }
  return lifeAreaOrder.find(area => normalized === area || lifeAreaKeywordMap[area].some(keyword => normalized.includes(keyword)));
};

const getJournalEntryAreas = (entry: JournalEntry, state: AppState, goalMap: Record<string, Goal>): LifeArea[] => {
  const areas = new Set<LifeArea>();
  entry.reflectionInsights?.life_areas?.forEach(areaLabel => {
    const mapped = inferLifeAreaFromToken(areaLabel);
    if (mapped) {
      areas.add(mapped);
    }
  });
  entry.tags?.forEach(tag => {
    const mapped = inferLifeAreaFromToken(tag);
    if (mapped) {
      areas.add(mapped);
    }
  });
  if (entry.linkedGoalId) {
    const goal = goalMap[entry.linkedGoalId];
    const area = resolveGoalLifeArea(goal, state.aspirations);
    if (area) {
      areas.add(area);
    }
  }
  if (areas.size === 0) {
    inferLifeAreasFromText(entry.content).forEach(area => areas.add(area));
  }
  return Array.from(areas);
};

const extractJournalHighlights = (entry: JournalEntry): string[] => {
  const highlights: string[] = [];
  const insights = entry.reflectionInsights;
  const collections = [insights?.goal_alignment, insights?.wins, insights?.energizers, insights?.drainers];
  collections.forEach(collection => {
    collection?.forEach(item => {
      if (item) {
        highlights.push(item);
      }
    });
  });
  if (highlights.length === 0 && entry.content) {
    highlights.push(formatSnippet(entry.content));
  }
  return highlights;
};

const formatSnippet = (text: string, maxLength = 70): string => {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1)}…`;
};
