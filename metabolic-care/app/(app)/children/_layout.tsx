import { Stack } from 'expo-router';
import { colors } from '../../../src/components/ui';

export default function ChildrenLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: colors.primary, headerTitleStyle: { fontWeight: '700' } }}>
      <Stack.Screen name="index" options={{ title: 'Children' }} />
      <Stack.Screen name="new" options={{ title: 'Add child', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Child details' }} />
    </Stack>
  );
}
