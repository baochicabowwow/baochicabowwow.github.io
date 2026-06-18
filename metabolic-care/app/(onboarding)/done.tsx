import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Button, Text, colors, spacing } from '../../src/components/ui';
import { Ionicons } from '@expo/vector-icons';

export default function OnboardingDone() {
  const { childName } = useLocalSearchParams<{ childName: string }>();
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.container}>
        <Ionicons name="checkmark-circle" size={80} color={colors.success} />
        <Text variant="h2" style={styles.title}>You're all set!</Text>
        {childName && (
          <Text variant="body" color={colors.textSecondary} style={styles.sub}>
            {childName}'s profile and nutrient limits are ready.
          </Text>
        )}

        <View style={styles.tips}>
          <View style={styles.tip}>
            <Ionicons name="restaurant-outline" size={20} color={colors.primary} />
            <Text variant="bodySmall" color={colors.textSecondary}>
              Go to Diet → Log meal to record {childName ? `${childName}'s` : 'your child\'s'} first meal.
            </Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <Text variant="bodySmall" color={colors.textSecondary}>
              Import your dietitian's CSV from Diet → Import CSV to load your food database.
            </Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
            <Text variant="bodySmall" color={colors.textSecondary}>
              Analytics shows daily trends once you've logged a few meals.
            </Text>
          </View>
        </View>

        <Button
          title="Go to dashboard"
          onPress={() => router.replace('/(app)/')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  title: { textAlign: 'center' },
  sub: { textAlign: 'center' },
  tips: { gap: spacing.md, width: '100%' },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
});
