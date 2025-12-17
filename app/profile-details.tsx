import { Stack, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Edit2, Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import Colors from '../constants/colors';

const GOAL_LABELS: Record<string, string> = {
  'understand': 'Understand myself better',
  'growth': 'Track personal growth',
  'achieve': 'Achieve my goals and dreams',
  'productive': 'Be more productive',
  'organized': 'Be more organized',
  'manage': 'Manage emotions and stress',
  'habits': 'Build habits and consistency',
};

const AGE_GROUPS = [
  { value: '18-24', label: '18-24' },
  { value: '25-34', label: '25-34' },
  { value: '35-44', label: '35-44' },
  { value: '45-54', label: '45-54' },
  { value: '55+', label: '55+' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

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
];

export default function ProfileDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, updateUserProfile } = useAppState();
  const profile = state.userProfile;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.name || '');
  const [editAgeGroup, setEditAgeGroup] = useState(profile?.ageGroup || '');
  const [editGender, setEditGender] = useState(profile?.gender || '');
  const [editInterests, setEditInterests] = useState<string[]>(profile?.interests || []);
  const [editGoals, setEditGoals] = useState<string[]>(profile?.goals || []);
  const [customInterest, setCustomInterest] = useState('');
  const [customGoal, setCustomGoal] = useState('');

  const handleEdit = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setEditName(profile?.name || '');
    setEditAgeGroup(profile?.ageGroup || '');
    setEditGender(profile?.gender || '');
    setEditInterests(profile?.interests || []);
    setEditGoals(profile?.goals || []);
    setCustomInterest('');
    setCustomGoal('');
    setIsEditing(false);
  };

  const handleSave = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (!editName.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }

    updateUserProfile({
      name: editName.trim(),
      ageGroup: editAgeGroup as any,
      gender: editGender as any,
      interests: editInterests,
      goals: editGoals,
    });
    
    setIsEditing(false);
  };

  const toggleInterest = (interest: string) => {
    setEditInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const addCustomInterest = () => {
    if (customInterest.trim() && !editInterests.includes(customInterest.trim())) {
      setEditInterests(prev => [...prev, customInterest.trim()]);
      setCustomInterest('');
    }
  };

  const toggleGoal = (goal: string) => {
    setEditGoals(prev =>
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const addCustomGoal = () => {
    if (customGoal.trim() && !editGoals.includes(customGoal.trim())) {
      setEditGoals(prev => [...prev, customGoal.trim()]);
      setCustomGoal('');
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Profile',
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.text,
          headerRight: () => (
            isEditing ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={handleCancel}>
                  <X size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave}>
                  <Check size={24} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={handleEdit}>
                <Edit2 size={20} color={Colors.primary} />
              </TouchableOpacity>
            )
          ),
        }} 
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          {isEditing ? (
            <>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Name</Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="Enter your name"
                  placeholderTextColor={Colors.textSecondary}
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Age Group</Text>
                <View style={styles.editOptionsContainer}>
                  {AGE_GROUPS.map((group) => (
                    <TouchableOpacity
                      key={group.value}
                      style={[styles.editOption, editAgeGroup === group.value && styles.editOptionSelected]}
                      onPress={() => setEditAgeGroup(group.value)}
                    >
                      <Text style={[styles.editOptionText, editAgeGroup === group.value && styles.editOptionTextSelected]}>
                        {group.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Gender</Text>
                <View style={styles.editOptionsContainer}>
                  {GENDERS.map((g) => (
                    <TouchableOpacity
                      key={g.value}
                      style={[styles.editOption, editGender === g.value && styles.editOptionSelected]}
                      onPress={() => setEditGender(g.value)}
                    >
                      <Text style={[styles.editOptionText, editGender === g.value && styles.editOptionTextSelected]}>
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <>
              {profile?.name && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{profile.name}</Text>
                </View>
              )}
              
              {profile?.ageGroup && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Age Group</Text>
                  <Text style={styles.infoValue}>
                    {AGE_GROUPS.find(g => g.value === profile.ageGroup)?.label || profile.ageGroup}
                  </Text>
                </View>
              )}
              
              {profile?.gender && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Gender</Text>
                  <Text style={styles.infoValue}>
                    {GENDERS.find(g => g.value === profile.gender)?.label || 'Prefer not to say'}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {(isEditing || (profile?.interests && profile.interests.length > 0)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests & Hobbies</Text>
            {isEditing ? (
              <>
                <View style={styles.chipContainer}>
                  {INTEREST_OPTIONS.map((interest) => (
                    <TouchableOpacity
                      key={interest}
                      style={[styles.chip, editInterests.includes(interest) && styles.chipSelected]}
                      onPress={() => toggleInterest(interest)}
                    >
                      <Text style={[styles.chipText, editInterests.includes(interest) && styles.chipTextSelected]}>
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
                {editInterests.filter(i => !INTEREST_OPTIONS.includes(i)).length > 0 && (
                  <View style={[styles.chipContainer, { marginTop: 12 }]}>
                    {editInterests.filter(i => !INTEREST_OPTIONS.includes(i)).map((interest) => (
                      <View key={interest} style={[styles.chip, styles.chipSelected]}>
                        <Text style={[styles.chipText, styles.chipTextSelected]}>{interest}</Text>
                        <TouchableOpacity onPress={() => toggleInterest(interest)} style={{ marginLeft: 6 }}>
                          <X size={14} color={Colors.surface} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.chipContainer}>
                {profile?.interests?.map((interest, index) => (
                  <View key={index} style={styles.chip}>
                    <Text style={styles.chipText}>{interest}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {(isEditing || (profile?.goals && profile.goals.length > 0)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What I Want to Accomplish</Text>
            {isEditing ? (
              <>
                <View style={styles.goalsList}>
                  {GOAL_OPTIONS.map((goal) => (
                    <TouchableOpacity
                      key={goal.value}
                      style={[styles.editOption, editGoals.includes(goal.value) && styles.editOptionSelected]}
                      onPress={() => toggleGoal(goal.value)}
                    >
                      <Text style={[styles.editOptionText, editGoals.includes(goal.value) && styles.editOptionTextSelected]}>
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
                {editGoals.filter(g => !GOAL_OPTIONS.some(opt => opt.value === g)).length > 0 && (
                  <View style={[styles.chipContainer, { marginTop: 12 }]}>
                    {editGoals.filter(g => !GOAL_OPTIONS.some(opt => opt.value === g)).map((goal) => (
                      <View key={goal} style={[styles.chip, styles.chipSelected]}>
                        <Text style={[styles.chipText, styles.chipTextSelected]}>{goal}</Text>
                        <TouchableOpacity onPress={() => toggleGoal(goal)} style={{ marginLeft: 6 }}>
                          <X size={14} color={Colors.surface} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.goalsList}>
                {profile?.goals?.map((goal, index) => {
                  const goalLabel = GOAL_LABELS[goal] || goal;
                  return (
                    <View key={index} style={styles.goalItem}>
                      <View style={styles.goalBullet} />
                      <Text style={styles.goalText}>{goalLabel}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {profile?.lifeAreaRanking && profile.lifeAreaRanking.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Life Area Priorities</Text>
            <View style={styles.rankingList}>
              {profile.lifeAreaRanking.map((area, index) => (
                <View key={index} style={styles.rankingItem}>
                  <View style={styles.rankNumber}>
                    <Text style={styles.rankNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.rankText}>
                    {area.charAt(0).toUpperCase() + area.slice(1)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  infoValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  chipContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  chip: {
    backgroundColor: Colors.primary + '20',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'transparent' as const,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  chipTextSelected: {
    color: Colors.surface,
  },
  goalsList: {
    gap: 12,
  },
  goalItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
    marginRight: 12,
  },
  goalText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  rankingList: {
    gap: 12,
  },
  rankingItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rankNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  rankNumberText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.surface,
  },
  rankText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  editField: {
    marginBottom: 24,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  editInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editOptionsContainer: {
    gap: 8,
  },
  editOption: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  editOptionText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  editOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  customInputContainer: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 12,
  },
  customInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center' as const,
  },
  addButtonText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
