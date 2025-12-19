import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useCallback, useEffect, type ComponentType } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Heart, Briefcase, Activity, Wallet, Sprout, Plus } from 'lucide-react-native';
import { useAppState } from '../contexts/AppStateContext';
import Colors from '../constants/colors';
import type { LifeArea, Aspiration } from '../types';
import React from "react";

const LIFE_AREA_CONFIG: Record<LifeArea, { label: string; icon: ComponentType<any>; prompt: string }> = {
  relationship: { 
    label: 'Relationship', 
    icon: Heart,
    prompt: 'What do you desire in your relationships?'
  },
  career: { 
    label: 'Career', 
    icon: Briefcase,
    prompt: 'What do you desire in your career?'
  },
  health: { 
    label: 'Health', 
    icon: Activity,
    prompt: 'What do you desire for your health (body and mind)?'
  },
  finance: { 
    label: 'Finance', 
    icon: Wallet,
    prompt: 'What do you desire financially?'
  },
  growth: { 
    label: 'Growth', 
    icon: Sprout,
    prompt: 'What do you desire for your growth?'
  },
};

export default function AspirationEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lifeArea?: LifeArea; aspirationId?: string }>();
  const { state, addAspiration, updateAspiration } = useAppState();
  
  const lifeArea = params.lifeArea as LifeArea;
  const existingAspiration = params.aspirationId 
    ? state.aspirations.find(a => a.id === params.aspirationId)
    : state.aspirations.find(a => a.lifeArea === lifeArea);

  const [description, setDescription] = useState<string>(existingAspiration?.description || '');
  const MAX_CHARACTERS = 300 as const;

  useEffect(() => {
    if (existingAspiration) {
      setDescription(existingAspiration.description);
    }
  }, [existingAspiration]);

  const handleDescriptionChange = (text: string) => {
    if (text.length <= MAX_CHARACTERS) {
      setDescription(text);
    }
  };

  const associatedGoals = state.goals.filter(goal => 
    goal.aspirationId === existingAspiration?.id
  );

  const handleCreateGoal = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (!existingAspiration) {
      Alert.alert('Save First', 'Please save your aspiration before creating goals.');
      return;
    }
    
    router.push(`/goal-setup?aspirationId=${existingAspiration.id}`);
  };

  const handleSave = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (!description.trim()) {
      Alert.alert('Required', 'Please enter your aspiration.');
      return;
    }

    if (existingAspiration) {
      updateAspiration(existingAspiration.id, {
        description: description.trim(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      const newAspiration: Aspiration = {
        id: Date.now().toString(),
        lifeArea,
        description: description.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addAspiration(newAspiration);
    }
    
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  }, [description, lifeArea, existingAspiration, addAspiration, updateAspiration, router]);

  const config = LIFE_AREA_CONFIG[lifeArea];
  const IconComponent = config?.icon;

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: existingAspiration ? 'Edit Aspiration' : 'New Aspiration',
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.text,
        }} 
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {IconComponent && <IconComponent size={40} color={Colors.primary} />}
          </View>
          
          <Text style={styles.title}>{config?.label}</Text>
          <Text style={styles.subtitle}>
            {config?.prompt || 'What do you aspire to achieve in this area of your life?'}
          </Text>

          <TextInput
            style={styles.textArea}
            placeholder="Describe your aspiration..."
            placeholderTextColor={Colors.textSecondary}
            value={description}
            onChangeText={handleDescriptionChange}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={MAX_CHARACTERS}
          />
          <Text style={styles.characterCount}>
            {description.length}/{MAX_CHARACTERS}
          </Text>

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSave}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>
              {existingAspiration ? 'Update Aspiration' : 'Save Aspiration'}
            </Text>
          </TouchableOpacity>

          {existingAspiration && (
            <View style={styles.goalsSection}>
              <View style={styles.goalsSectionHeader}>
                <Text style={styles.goalsSectionTitle}>Related Goals</Text>
                <TouchableOpacity onPress={handleCreateGoal} style={styles.addGoalButton}>
                  <Plus size={16} color={Colors.primary} />
                  <Text style={styles.addGoalText}>Add Goal</Text>
                </TouchableOpacity>
              </View>

              {associatedGoals.length === 0 ? (
                <Text style={styles.noGoalsText}>No goals yet. Create one to track your progress!</Text>
              ) : (
                <View style={styles.goalsList}>
                  {associatedGoals.map(goal => (
                    <View key={goal.id} style={styles.goalItem}>
                      <Text style={styles.goalTitle}>{goal.title}</Text>
                      {goal.targetDate && (
                        <Text style={styles.goalDate}>
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
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
  content: {
    flex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    alignSelf: 'center' as const,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  textArea: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    minHeight: 160,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.surface,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right' as const,
    marginTop: -16,
    marginBottom: 16,
  },
  goalsSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  goalsSectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  goalsSectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  addGoalButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addGoalText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  noGoalsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
    paddingVertical: 16,
  },
  goalsList: {
    gap: 12,
  },
  goalItem: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  goalDate: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
