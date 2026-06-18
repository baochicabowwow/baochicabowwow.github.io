import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Text, Button, colors, spacing } from '../../src/components/ui';
import { useAuth } from '../../src/features/auth/AuthContext';
import { useChildren } from '../../src/features/children/useChildren';
import { useNutrientTargets } from '../../src/features/children/useNutrientTargets';
import { useTodayIntake } from '../../src/features/analytics/useDailyIntake';
import { useTodayMeals } from '../../src/features/diet/useMeals';
import { DailyNutrientSummary } from '../../src/components/DailyNutrientSummary';
import type { Child } from '../../src/lib/database.types';

export default function TodayScreen() {
  const { primaryCircle } = useAuth();
  const router = useRouter();

  const { data: children, isLoading, refetch } = useChildren(primaryCircle?.id);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const activeChildId = selectedChildId ?? children?.[0]?.id;
  const { data: targets } = useNutrientTargets(activeChildId);
  const { data: todayIntake, refetch: refetchIntake } = useTodayIntake(activeChildId, 'lysine');
  const { data: todayMeals, refetch: refetchMeals } = useTodayMeals(activeChildId);

  const lysineTarget = targets?.find((t) => t.nutrient_key === 'lysine');
  const activeChild = children?.find((c) => c.id === activeChildId);

  function getEffectiveLimit() {
    if (!lysineTarget || !activeChild) return null;
    if (lysineTarget.basis === 'per_kg') {
      if (!lysineTarget.per_kg_amount || !activeChild.weight_kg) return null;
      return lysineTarget.per_kg_amount * activeChild.weight_kg;
    }
    return lysineTarget.daily_limit_amount ?? null;
  }

  async function handleRefresh() {
    await Promise.all([refetch(), refetchIntake(), refetchMeals()]);
  }

  if (!primaryCircle) {
    return (
      <Screen>
        <View style={styles.empty}>
          <Text variant="h3">Welcome to Metabolic Care</Text>
          <Text variant="body" color={colors.textSecondary} style={styles.emptyText}>
            Your care circle is being set up. Please sign out and sign in again if this persists.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={todayMeals ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="h2">Today</Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>

            {/* Child selector */}
            {(children?.length ?? 0) > 1 && (
              <View style={styles.childSelector}>
                {children!.map((child: Child) => (
                  <TouchableOpacity
                    key={child.id}
                    onPress={() => setSelectedChildId(child.id)}
                    style={[
                      styles.childTab,
                      child.id === activeChildId && styles.childTabActive,
                    ]}
                  >
                    <Text
                      variant="bodySmall"
                      color={child.id === activeChildId ? colors.primary : colors.textSecondary}
                      style={{ fontWeight: child.id === activeChildId ? '700' : '400' }}
                    >
                      {child.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Lysine summary */}
            {activeChildId && (
              <DailyNutrientSummary
                nutrientLabel="Lysine"
                unit="mg"
                consumed={todayIntake?.total_amount ?? 0}
                limit={getEffectiveLimit()}
              />
            )}

            {/* Add meal CTA */}
            <View style={styles.row}>
              <Text variant="h3" style={{ flex: 1 }}>Meals today</Text>
              <Button
                title="+ Log meal"
                size="sm"
                onPress={() => router.push('/(app)/diet/log')}
              />
            </View>

            {!activeChildId && (
              <Card style={styles.noChildCard}>
                <Text variant="body" color={colors.textSecondary}>
                  No children added yet.
                </Text>
                <Button
                  title="Add child"
                  size="sm"
                  variant="secondary"
                  style={{ marginTop: spacing.sm }}
                  onPress={() => router.push('/(app)/children/new')}
                />
              </Card>
            )}
          </View>
        }
        renderItem={({ item: meal }) => (
          <Card style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <Text variant="label" color={colors.textSecondary} style={{ textTransform: 'capitalize' }}>
                {meal.meal_type ?? 'Meal'}
              </Text>
              <Text variant="caption" color={colors.textMuted}>
                {new Date(meal.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            {meal.meal_items.map((item) => {
              const lysine = (item.computed_nutrients as Record<string, number>)['lysine_mg'];
              return (
                <View key={item.id} style={styles.mealItem}>
                  <Text variant="body" style={{ flex: 1 }}>{item.food?.name}</Text>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {item.amount_grams}g
                  </Text>
                  {lysine != null && (
                    <Text variant="bodySmall" color={colors.primary} style={styles.nutrientBadge}>
                      {Math.round(lysine)} mg
                    </Text>
                  )}
                </View>
              );
            })}
          </Card>
        )}
        ListEmptyComponent={
          <Card style={styles.emptyMeals}>
            <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
              No meals logged today
            </Text>
          </Card>
        }
        contentContainerStyle={styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  childSelector: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  childTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  childTabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  mealCard: { marginBottom: spacing.sm, gap: spacing.xs },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
  nutrientBadge: { fontWeight: '600' },
  noChildCard: { alignItems: 'center' },
  emptyMeals: { alignItems: 'center', padding: spacing.xl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyText: { textAlign: 'center' },
  list: { padding: spacing.md },
});
