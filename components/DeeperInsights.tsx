import { ReactNode, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Heart,
  Shield,
  Smile,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react-native';
import Colors from '../constants/colors';
import type { ReflectionInsightsData } from '../types';

interface DeeperInsightsProps {
  insights: ReflectionInsightsData;
  hasActiveGoals?: boolean;
}

const insightSections: {
  key: keyof ReflectionInsightsData;
  title: string;
  subtitle: string;
  icon: ReactNode;
}[] = [
  {
    key: 'life_areas',
    title: 'Life Areas Mentioned',
    subtitle: 'Where your attention went',
    icon: <Sparkles size={18} color={Colors.primary} />,
  },
  {
    key: 'goal_alignment',
    title: 'Goal Alignment',
    subtitle: 'Moments tied to your goals',
    icon: <Target size={18} color={Colors.accent} />,
  },
  {
    key: 'emotions',
    title: 'Emotional Themes',
    subtitle: 'Felt experiences you named',
    icon: <Heart size={18} color={Colors.warning} />,
  },
  {
    key: 'wins',
    title: 'Wins & Accomplishments',
    subtitle: 'Bright spots to keep close',
    icon: <Smile size={18} color={Colors.primary} />,
  },
  {
    key: 'energizers',
    title: 'Energizers',
    subtitle: 'What lifted you up',
    icon: <Zap size={18} color={Colors.accent} />,
  },
  {
    key: 'drainers',
    title: 'Drainers',
    subtitle: 'What pulled energy away',
    icon: <Shield size={18} color={Colors.textSecondary} />,
  },
];

export default function DeeperInsights({
  insights,
  hasActiveGoals = true,
}: DeeperInsightsProps) {
  const hasAnyInsightContent = useMemo(
    () => insightSections.some(section => insights[section.key].length > 0),
    [insights]
  );

  return (
    <View style={styles.insightsWrapper}>
      <Text style={styles.cardHeading}>Deeper Insights</Text>
      <Text style={styles.insightsSubtitle}>
        A gentle summary of what stood out this week.
      </Text>
      <View style={styles.insightSectionsContainer}>
        {insightSections.map((section, index) => {
          const items = insights[section.key];
          const isEmpty = items.length === 0;
          const isLast = index === insightSections.length - 1;
          const isGoalAlignmentSection = section.key === 'goal_alignment';
          const emptyCopy = isGoalAlignmentSection && !hasActiveGoals
            ? "You don't currently have an active goal."
            : 'No details captured here.';
          return (
            <View
              key={section.key}
              style={[styles.insightSection, isLast && styles.insightSectionLast]}
              testID={`insight-section-${section.key}`}
            >
              <View style={styles.insightHeaderRow}>
                <View style={styles.insightIconWrapper}>{section.icon}</View>
                <View style={styles.insightHeaderText}>
                  <Text style={styles.insightTitle}>{section.title}</Text>
                  <Text style={styles.insightSubtitle}>{section.subtitle}</Text>
                </View>
              </View>
              {isEmpty ? (
                <Text style={styles.insightEmptyText}>{emptyCopy}</Text>
              ) : (
                <View style={styles.pillRow}>
                  {items.map((item, idx) => (
                    <View key={`${section.key}-${idx}`} style={styles.pill}>
                      <Text style={styles.pillText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
        {!hasAnyInsightContent && (
          <Text style={styles.placeholderInsight}>
            Share a bit more detail next time to unlock richer insights.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  insightsWrapper: {
    marginTop: 12,
    paddingVertical: 12,
  },
  insightsSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 20,
  },
  insightSectionsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    gap: 34,
  },
  insightSection: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingBottom: 30,
    gap: 18,
  },
  insightSectionLast: {
    borderBottomWidth: 0,
    paddingBottom: 6,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  insightIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightHeaderText: {
    flex: 1,
  },
  insightTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  insightSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  insightEmptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    paddingLeft: 4,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(50, 208, 193, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(50, 208, 193, 0.4)',
  },
  pillText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  placeholderInsight: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
});
