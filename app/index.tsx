import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import Colors from '@/constants/colors';
import { useAppState } from '@/contexts/AppStateContext';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { state, isLoading } = useAppState();
  const { session, isAuthLoading } = useAuth();

  if (isLoading || isAuthLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (session && !state.userProfile?.onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/today" />;
}
