import { Stack } from 'expo-router';
import { colors } from '../../../src/components/ui';

export default function DietLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Diet' }} />
      <Stack.Screen name="log" options={{ title: 'Log meal', presentation: 'modal' }} />
      <Stack.Screen name="food-search" options={{ title: 'Find food', presentation: 'modal' }} />
      <Stack.Screen name="csv-import" options={{ title: 'Import CSV', presentation: 'modal' }} />
    </Stack>
  );
}
