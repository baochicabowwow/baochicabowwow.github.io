import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Text, Button, colors, spacing } from '../../../src/components/ui';
import { Ionicons } from '@expo/vector-icons';

interface QuickLink {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  route: string;
}

const QUICK_LINKS: QuickLink[] = [
  {
    icon: 'add-circle-outline',
    title: 'Log a meal',
    description: 'Record food items and calculate lysine',
    route: '/(app)/diet/log',
  },
  {
    icon: 'search-outline',
    title: 'Search foods',
    description: 'Browse the food database',
    route: '/(app)/diet/food-search',
  },
  {
    icon: 'document-text-outline',
    title: 'Import CSV',
    description: "Load your dietitian's lysine data",
    route: '/(app)/diet/csv-import',
  },
];

export default function DietIndex() {
  const router = useRouter();

  return (
    <Screen>
      <Text variant="h2" style={styles.heading}>Diet</Text>
      <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
        Log meals, manage foods, and track lysine intake
      </Text>

      <View style={styles.links}>
        {QUICK_LINKS.map((link) => (
          <TouchableOpacity key={link.route} onPress={() => router.push(link.route as any)}>
            <Card style={styles.linkCard}>
              <Ionicons name={link.icon} size={28} color={colors.primary} />
              <View style={styles.linkText}>
                <Text variant="h3">{link.title}</Text>
                <Text variant="bodySmall" color={colors.textSecondary}>{link.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.lg },
  links: { gap: spacing.sm },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  linkText: { flex: 1, gap: 2 },
});
