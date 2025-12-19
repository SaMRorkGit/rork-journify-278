import { Stack } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Check, Edit2, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import Colors from '../constants/colors';


const AGE_GROUPS = [
  { value: '', label: 'Not set' },
  { value: '18-24', label: '18-24' },
  { value: '25-34', label: '25-34' },
  { value: '35-44', label: '35-44' },
  { value: '45-54', label: '45-54' },
  { value: '55+', label: '55+' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const GENDERS = [
  { value: '', label: 'Not set' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const IDENTITY_OPTIONS = [
  { emoji: '🏃', label: 'Runner' },
  { emoji: '🎨', label: 'Artist / Creative' },
  { emoji: '👔', label: 'Professional / Leader' },
  { emoji: '📚', label: 'Learner / Student' },
  { emoji: '👨‍👩‍👧', label: 'Parent / Caregiver' },
  { emoji: '🧘', label: 'Mindful person' },
  { emoji: '🍳', label: 'Foodie / Chef' },
  { emoji: '💼', label: 'Entrepreneur' },
  { emoji: '📝', label: 'Writer' },
  { emoji: '🎵', label: 'Musician' },
  { emoji: '🌱', label: 'Gardener' },
  { emoji: '🐕', label: 'Pet parent' },
  { emoji: '🌍', label: 'Traveler' },
  { emoji: '💪', label: 'Fitness enthusiast / Athlete' },
  { emoji: '🧠', label: 'Thinker / Philosopher' },
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
  const [editIdentityTags, setEditIdentityTags] = useState<string[]>(profile?.identityTags || []);
  const [customInterest, setCustomInterest] = useState('');
  const [customIdentity, setCustomIdentity] = useState('');

  const [ageGroupSelectOpen, setAgeGroupSelectOpen] = useState(false);
  const [genderSelectOpen, setGenderSelectOpen] = useState(false);

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
    setEditIdentityTags(profile?.identityTags || []);
    setCustomInterest('');
    setCustomIdentity('');
    setIsEditing(false);
  };

  const handleSave = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    updateUserProfile({
      name: editName.trim() ? editName.trim() : undefined,
      ageGroup: editAgeGroup ? (editAgeGroup as any) : undefined,
      gender: editGender ? (editGender as any) : undefined,
      interests: editInterests,
      identityTags: editIdentityTags.length > 0 ? editIdentityTags : undefined,
    });

    setIsEditing(false);
  };

  const toggleInterest = (interest: string) => {
    setEditInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const toggleIdentityTag = useCallback((tag: string) => {
    setEditIdentityTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, tag];
    });
  }, []);

  const identityOptionsTextToEmoji = useMemo(() => {
    const map = new Map<string, string>();
    IDENTITY_OPTIONS.forEach((o) => map.set(o.label, o.emoji));
    return map;
  }, []);

  const identityUnknownTags = useMemo(() => {
    const known = new Set(IDENTITY_OPTIONS.map((o) => o.label));
    return editIdentityTags.filter((t) => !known.has(t));
  }, [editIdentityTags]);

  const addCustomInterest = () => {
    if (customInterest.trim() && !editInterests.includes(customInterest.trim())) {
      setEditInterests(prev => [...prev, customInterest.trim()]);
      setCustomInterest('');
    }
  };

  const addCustomIdentity = () => {
    const trimmed = customIdentity.trim();
    if (trimmed && !editIdentityTags.includes(trimmed) && editIdentityTags.length < 3) {
      setEditIdentityTags((prev) => [...prev, trimmed]);
      setCustomIdentity('');
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
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setAgeGroupSelectOpen(true)}
                  testID="profileDetailsAgeGroupSelectOpen"
                >
                  <Text style={styles.selectButtonText}>
                    {AGE_GROUPS.find((g) => g.value === editAgeGroup)?.label ?? 'Not set'}
                  </Text>
                  <ChevronDown size={18} color={Colors.textSecondary} />
                </TouchableOpacity>

                <Modal
                  visible={ageGroupSelectOpen}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setAgeGroupSelectOpen(false)}
                >
                  <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={1}
                    onPress={() => setAgeGroupSelectOpen(false)}
                    testID="profileDetailsAgeGroupSelectBackdrop"
                  >
                    <View style={styles.modalCard}>
                      <Text style={styles.modalTitle}>Age Group</Text>
                      <View style={styles.modalList}>
                        {AGE_GROUPS.map((group) => {
                          const selected = editAgeGroup === group.value;
                          return (
                            <TouchableOpacity
                              key={group.value || 'not-set'}
                              style={[styles.modalRow, selected && styles.modalRowSelected]}
                              onPress={() => {
                                setEditAgeGroup(group.value);
                                setAgeGroupSelectOpen(false);
                              }}
                              testID={`profileDetailsAgeGroupOption-${group.value || 'not-set'}`}
                            >
                              <Text style={[styles.modalRowText, selected && styles.modalRowTextSelected]}>{group.label}</Text>
                              {selected ? <Check size={18} color={Colors.primary} /> : <View style={{ width: 18, height: 18 }} />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </TouchableOpacity>
                </Modal>
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Gender</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setGenderSelectOpen(true)}
                  testID="profileDetailsGenderSelectOpen"
                >
                  <Text style={styles.selectButtonText}>
                    {GENDERS.find((g) => g.value === editGender)?.label ?? 'Not set'}
                  </Text>
                  <ChevronDown size={18} color={Colors.textSecondary} />
                </TouchableOpacity>

                <Modal
                  visible={genderSelectOpen}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setGenderSelectOpen(false)}
                >
                  <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={1}
                    onPress={() => setGenderSelectOpen(false)}
                    testID="profileDetailsGenderSelectBackdrop"
                  >
                    <View style={styles.modalCard}>
                      <Text style={styles.modalTitle}>Gender</Text>
                      <View style={styles.modalList}>
                        {GENDERS.map((g) => {
                          const selected = editGender === g.value;
                          return (
                            <TouchableOpacity
                              key={g.value || 'not-set'}
                              style={[styles.modalRow, selected && styles.modalRowSelected]}
                              onPress={() => {
                                setEditGender(g.value);
                                setGenderSelectOpen(false);
                              }}
                              testID={`profileDetailsGenderOption-${g.value || 'not-set'}`}
                            >
                              <Text style={[styles.modalRowText, selected && styles.modalRowTextSelected]}>{g.label}</Text>
                              {selected ? <Check size={18} color={Colors.primary} /> : <View style={{ width: 18, height: 18 }} />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </TouchableOpacity>
                </Modal>
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
          <Text style={styles.sectionTitle}>Identity</Text>
          {isEditing ? (
            <>
              <View style={styles.chipContainer} testID="profileDetailsIdentityOptions">
                {IDENTITY_OPTIONS.map((opt) => {
                  const selected = editIdentityTags.includes(opt.label);
                  return (
                    <TouchableOpacity
                      key={opt.label}
                      style={[styles.identityChip, selected && styles.identityChipSelected]}
                      onPress={() => toggleIdentityTag(opt.label)}
                      testID={`profileDetailsIdentityOption-${opt.label}`}
                    >
                      <Text style={[styles.identityChipEmoji, selected && styles.identityChipEmojiSelected]}>{opt.emoji}</Text>
                      <Text style={[styles.identityChipText, selected && styles.identityChipTextSelected]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  placeholder={editIdentityTags.length >= 3 ? 'Max 3 identities selected' : 'Add your own...'}
                  placeholderTextColor={Colors.textSecondary}
                  value={customIdentity}
                  onChangeText={setCustomIdentity}
                  onSubmitEditing={addCustomIdentity}
                  editable={editIdentityTags.length < 3}
                  testID="profileDetailsCustomIdentityInput"
                />
                <TouchableOpacity
                  style={[styles.addButton, editIdentityTags.length >= 3 && { opacity: 0.5 }]}
                  onPress={addCustomIdentity}
                  disabled={editIdentityTags.length >= 3}
                  testID="profileDetailsCustomIdentityAdd"
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>

              {identityUnknownTags.length > 0 && (
                <View style={[styles.chipContainer, { marginTop: 12 }]} testID="profileDetailsIdentityUnknownTags">
                  {identityUnknownTags.map((tag) => (
                    <View key={tag} style={[styles.chip, styles.chipSelected]}>
                      <Text style={[styles.chipText, styles.chipTextSelected]}>{tag}</Text>
                      <TouchableOpacity
                        onPress={() => toggleIdentityTag(tag)}
                        style={{ marginLeft: 6 }}
                        testID={`profileDetailsRemoveUnknownIdentity-${tag}`}
                      >
                        <X size={14} color={Colors.surface} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Text style={[styles.subtitleHint, { marginTop: 12 }]} testID="profileDetailsIdentityCount">
                {editIdentityTags.length}/3 selected
              </Text>
            </>
          ) : profile?.identityTags && profile.identityTags.length > 0 ? (
            <View style={styles.chipContainer} testID="profileDetailsIdentityList">
              {profile.identityTags.map((tag, index) => (
                <View key={`${tag}-${index}`} style={styles.chip}>
                  <Text style={styles.chipText}>
                    {(identityOptionsTextToEmoji.get(tag) ? `${identityOptionsTextToEmoji.get(tag)} ` : '') + tag}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.infoRow} testID="profileDetailsIdentityEmpty">
              <Text style={styles.infoLabel}>Identity</Text>
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
  selectButton: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  selectButtonText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 18,
    justifyContent: 'center' as const,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden' as const,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  modalList: {
    paddingBottom: 10,
  },
  modalRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalRowSelected: {
    backgroundColor: Colors.primary + '10',
  },
  modalRowText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
    flex: 1,
    paddingRight: 12,
  },
  modalRowTextSelected: {
    color: Colors.primary,
    fontWeight: '700' as const,
  },
  identityChip: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  identityChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  identityChipEmoji: {
    fontSize: 14,
    color: Colors.text,
  },
  identityChipEmojiSelected: {
    color: Colors.text,
  },
  identityChipText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  identityChipTextSelected: {
    color: Colors.primary,
  },
  subtitleHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
});
