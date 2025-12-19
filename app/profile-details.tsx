import { Stack } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Edit2, Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import Colors from '../constants/colors';


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


export default function ProfileDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { state, updateUserProfile } = useAppState();
  const profile = state.userProfile;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.name || '');
  const [editAgeGroup, setEditAgeGroup] = useState(profile?.ageGroup || '');
  const [editGender, setEditGender] = useState(profile?.gender || '');
  const [editInterests, setEditInterests] = useState<string[]>(profile?.interests || []);
  const [customInterest, setCustomInterest] = useState('');

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
    setCustomInterest('');
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
          <Text style={styles.sectionTitle}>Profile Information</Text>

          {isEditing ? (
            <>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>User Name</Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="Enter your name"
                  placeholderTextColor={Colors.textSecondary}
                  value={editName}
                  onChangeText={setEditName}
                  testID="profileDetailsNameInput"
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
                      testID={`profileDetailsAgeGroupOption-${group.value}`}
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
                      testID={`profileDetailsGenderOption-${g.value}`}
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
              <View style={styles.infoRow} testID="profileDetailsNameRow">
                <Text style={styles.infoLabel}>User Name</Text>
                <Text style={styles.infoValue}>{profile?.name?.trim() ? profile.name : 'Not set'}</Text>
              </View>

              <View style={styles.infoRow} testID="profileDetailsAgeGroupRow">
                <Text style={styles.infoLabel}>Age Group</Text>
                <Text style={styles.infoValue}>
                  {profile?.ageGroup
                    ? AGE_GROUPS.find(g => g.value === profile.ageGroup)?.label || profile.ageGroup
                    : 'Not set'}
                </Text>
              </View>

              <View style={styles.infoRow} testID="profileDetailsGenderRow">
                <Text style={styles.infoLabel}>Gender</Text>
                <Text style={styles.infoValue}>
                  {profile?.gender ? GENDERS.find(g => g.value === profile.gender)?.label || profile.gender : 'Not set'}
                </Text>
              </View>
            </>
          )}
        </View>

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
                    testID={`profileDetailsInterestChip-${interest}`}
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
                  testID="profileDetailsCustomInterestInput"
                />
                <TouchableOpacity style={styles.addButton} onPress={addCustomInterest} testID="profileDetailsCustomInterestAdd">
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              {editInterests.filter(i => !INTEREST_OPTIONS.includes(i)).length > 0 && (
                <View style={[styles.chipContainer, { marginTop: 12 }]}>
                  {editInterests.filter(i => !INTEREST_OPTIONS.includes(i)).map((interest) => (
                    <View key={interest} style={[styles.chip, styles.chipSelected]}>
                      <Text style={[styles.chipText, styles.chipTextSelected]}>{interest}</Text>
                      <TouchableOpacity onPress={() => toggleInterest(interest)} style={{ marginLeft: 6 }} testID={`profileDetailsRemoveCustomInterest-${interest}`}>
                        <X size={14} color={Colors.surface} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : profile?.interests && profile.interests.length > 0 ? (
            <View style={styles.chipContainer} testID="profileDetailsInterestsList">
              {profile.interests.map((interest, index) => (
                <View key={`${interest}-${index}`} style={styles.chip}>
                  <Text style={styles.chipText}>{interest}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.infoRow} testID="profileDetailsInterestsEmpty">
              <Text style={styles.infoLabel}>Interests & Hobbies</Text>
              <Text style={styles.infoValue}>Not set</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identity tags</Text>
          {profile?.identityTags && profile.identityTags.length > 0 ? (
            <View style={styles.chipContainer} testID="profileDetailsIdentityTagsList">
              {profile.identityTags.map((tag, index) => (
                <View key={`${tag}-${index}`} style={styles.chip}>
                  <Text style={styles.chipText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.infoRow} testID="profileDetailsIdentityTagsEmpty">
              <Text style={styles.infoLabel}>Identity tags</Text>
              <Text style={styles.infoValue}>Not set</Text>
            </View>
          )}
        </View>

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
