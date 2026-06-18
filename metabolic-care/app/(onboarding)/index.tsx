import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Button, Text, colors, spacing } from '../../src/components/ui';
import { Ionicons } from '@expo/vector-icons';

const HIGHLIGHTS = [
  { icon: 'nutrition-outline', title: 'Track restricted nutrients', body: 'Log every meal and see real-time totals against your child\'s individual limits.' },
  { icon: 'shield-checkmark-outline', title: 'Stay within safe limits', body: 'Get instant feedback when a meal pushes your child toward or over their daily restriction.' },
  { icon: 'people-outline', title: 'Share with your care team', body: 'Invite doctors, dietitians, and family with tailored permissions.' },
] as const;

export default function OnboardingWelcome() {
  const router = useRouter();
  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Ionicons name="heart-circle" size={72} color={colors.primary} />
          <Text variant="h1" color={colors.primary} style={styles.appName}>Metabolic Care</Text>
          <Text variant="body" color={colors.textSecondary} style={styles.tagline}>
            Precision diet tracking for children with metabolic diseases
          </Text>
        </View>

        <View style={styles.highlights}>
          {HIGHLIGHTS.map(({ icon, title, body }) => (
            <View key={title} style={styles.highlight}>
              <Ionicons name={icon} size={28} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text variant="label">{title}</Text>
                <Text variant="bodySmall" color={colors.textSecondary}>{body}</Text>
              </View>
            </View>
          ))}
        </View>

        <Button
          title="Get started"
          onPress={() => router.push('/(onboarding)/child')}
          style={styles.cta}
        />
        <Text variant="caption" color={colors.textMuted} style={styles.note}>
          Takes about 2 minutes to set up
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.sm },
  appName: { textAlign: 'center' },
  tagline: { textAlign: 'center' },
  highlights: { gap: spacing.md },
  highlight: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  cta: {},
  note: { textAlign: 'center' },
});
