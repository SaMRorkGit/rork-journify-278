import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import type { MoodType } from '../../types';
import Colors from '../../constants/colors';

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useAppState();

  const formatMetaTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getMonthLabel = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  };

  const getDayLabel = (dateStr: string) => {
    return new Date(dateStr).getDate().toString().padStart(2, '0');
  };

  const getMoodEmoji = (mood: MoodType) => {
    const moodMap = {
      great: '😃',
      fine: '😊',
      neutral: '😐',
      stressed: '😖',
      low: '😢',
    } as const;
    return moodMap[mood];
  };

  const timelineEntries = useMemo(() => {
    const checkIns = state.dailyCheckIns.map(checkIn => ({
      kind: 'checkIn' as const,
      data: checkIn,
    }));

    const journalEntries = state.journalEntries
      .filter(entry => !entry.id.endsWith('-journal'))
      .map(entry => ({
        kind: 'journal' as const,
        data: entry,
      }));

    return [...checkIns, ...journalEntries].sort(
      (a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()
    );
  }, [state.dailyCheckIns, state.journalEntries]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <View style={styles.header}>
          <Ionicons name="book-outline" size={32} color={Colors.primary} />
          <Text style={styles.headerTitle}>Journal</Text>
          <Text style={styles.headerSubtitle}>Express your thoughts and reflect</Text>
        </View>

        <TouchableOpacity
          style={styles.newThoughtButton}
          onPress={() => router.push('/journal-compose')}
          testID="add-new-thought-button"
          activeOpacity={0.85}
        >
          <View style={styles.newThoughtContent}>
            <View style={styles.newThoughtIconWrap}>
              <Ionicons name="create-outline" size={20} color={Colors.surface} />
            </View>
            <View style={styles.newThoughtTextGroup}>
              <Text style={styles.newThoughtTitle}>Add a new thought</Text>
              <Text style={styles.newThoughtSubtitle}>Capture a focused entry</Text>
            </View>
          </View>
          <Text style={styles.newThoughtChevron}>›</Text>
        </TouchableOpacity>

        <ScrollView style={styles.entriesList} showsVerticalScrollIndicator={false}>
          {timelineEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No reflections yet</Text>
              <Text style={styles.emptySubtext}>
                Start by adding a new thought or journaling from Today
              </Text>
            </View>
          ) : (
            timelineEntries.map(entry => {
              const monthLabel = getMonthLabel(entry.data.createdAt);
              const dayLabel = getDayLabel(entry.data.createdAt);
              const moodEmoji =
                entry.kind === 'checkIn'
                  ? getMoodEmoji(entry.data.mood)
                  : entry.data.mood
                  ? getMoodEmoji(entry.data.mood)
                  : null;

              const reflectionTypes: string[] = [];
              if (entry.kind === 'checkIn') {
                reflectionTypes.push(
                  entry.data.type === 'morning' ? 'Morning Intention' : 'Evening Reflection'
                );
              } else if (entry.data.linkedGoalId || entry.data.tags?.includes('Goal')) {
                reflectionTypes.push('Goal');
              }

              const contentText =
                entry.kind === 'checkIn'
                  ? entry.data.reflection ?? ''
                  : entry.data.content;

              const entryContent = (
                <>
                  <View style={styles.dateColumn}>
                    <Text style={styles.monthLabel}>{monthLabel}</Text>
                    <Text style={styles.dayLabel}>{dayLabel}</Text>
                  </View>
                  <View style={styles.verticalDivider} />
                  <View style={styles.entryBody}>
                    <View style={styles.metaRow}>
                      <View style={styles.typeRow}>
                        {reflectionTypes.map(type => (
                          <View key={`${entry.data.id}-${type}`} style={styles.typePill}>
                            <Text style={styles.typePillText}>{type}</Text>
                          </View>
                        ))}
                      </View>
                      <View style={styles.metaInfo}>
                        <Text style={styles.metaDate}>{formatMetaTimestamp(entry.data.createdAt)}</Text>
                        {moodEmoji && <Text style={styles.metaMood}>{moodEmoji}</Text>}
                      </View>
                    </View>
                    {contentText ? <Text style={styles.entryText}>{contentText}</Text> : null}
                  </View>
                </>
              );

              if (entry.kind === 'journal') {
                return (
                  <TouchableOpacity
                    key={entry.data.id}
                    style={styles.entryRow}
                    testID={`journal-entry-${entry.data.id}`}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({ pathname: '/journal-entry/[id]', params: { id: entry.data.id } })
                    }
                  >
                    {entryContent}
                  </TouchableOpacity>
                );
              }

              return (
                <View key={entry.data.id} style={styles.entryRow} testID={`journal-entry-${entry.data.id}`}>
                  {entryContent}
                </View>
              );
            })
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // -- styles unchanged --
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  newThoughtButton: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newThoughtContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  newThoughtIconWrap: {
    backgroundColor: Colors.primary,
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newThoughtTextGroup: {
    gap: 2,
  },
  newThoughtTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  newThoughtSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  newThoughtChevron: {
    fontSize: 26,
    color: Colors.textSecondary,
    marginLeft: 12,
  },
  entriesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  entryRow: {
    flexDirection: 'row',
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    gap: 12,
  },
  dateColumn: {
    width: 48,
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  dayLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: Colors.border,
    borderRadius: 999,
  },
  entryBody: {
    flex: 1,
    paddingBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  typePill: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(50, 208, 193, 0.12)',
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  metaMood: {
    fontSize: 16,
  },
  entryText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    marginTop: 4,
  },
  bottomSpacer: {
    height: 40,
  },
});
