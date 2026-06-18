import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Text, Button, colors, spacing } from '../../src/components/ui';
import { useAuth } from '../../src/features/auth/AuthContext';
import { useChildren } from '../../src/features/children/useChildren';
import { useNutrientTargets } from '../../src/features/children/useNutrientTargets';
import { useTodayAllIntake } from '../../src/features/analytics/useDailyIntake';
import { useTodayMeals } from '../../src/features/diet/useMeals';
import { DailyNutrientSummary } from '../../src/components/DailyNutrientSummary';
import { getNutrientDisplayName, getNutrientUnit } from '../../src/lib/diseaseProfiles';
import type { Child, ChildNutrientTarget, DailyNutrientIntake, MealItem } from '../../src/lib/database.types';
import type { FoodWithNutrients } from '../../src/features/diet/useFoods';

export default function TodayScreen() {
  const { primaryCircle } = useAuth();
  const router = useRouter();

  const { data: children, isLoading, refetch } = useChildren(primaryCircle?.id);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const activeChildId = selectedChildId ?? children?.[0]?.id;
  const activeChild = children?.find((c: Child) => c.id === activeChildId);

  const { data: targets } = useNutrientTargets(activeChildId);
  const { data: allIntake, refetch: refetchIntake } = useTodayAllIntake(activeChildId);
  const { data: todayMeals, refetch: refetchMeals } = useTodayMeals(activeChildId);

  async function handleRefresh() {
    await Promise.all([refetch(), refetchIntake(), refetchMeals()]);
  }

  function getEffectiveLimit(target: { basis: string; per_kg_amount: number | null; daily_limit_amount: number | null }) {
    if (target.basis === 'per_kg') {
      if (!target.per_kg_amount || !activeChild?.weight_kg) return null;
      return target.per_kg_amount * activeChild.weight_kg;
    }
    return target.daily_limit_amount ?? null;
  }

  // Nutrient keys the child has targets for (to show in meal items)
  const trackedKeys = targets?.map((t: ChildNutrientTarget) => t.nutrient_key) ?? [];

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

            {/* Per-target nutrient summary cards */}
            {activeChildId && targets && targets.length > 0 && targets.map((target: ChildNutrientTarget) => {
              const intake = allIntake?.find((i: DailyNutrientIntake) => i.nutrient_key === target.nutrient_key);
              const limit = getEffectiveLimit(target);
              return (
                <DailyNutrientSummary
                  key={target.nutrient_key}
                  nutrientLabel={target.nutrient_key}
                  unit={getNutrientUnit(target.nutrient_key)}
                  consumed={intake?.total_amount ?? 0}
                  limit={limit}
                  limitType={(target.limit_type as 'upper' | 'lower') ?? 'upper'}
                />
              );
            })}

            {/* Prompt to set targets if none exist */}
            {activeChildId && targets && targets.length === 0 && (
              <Card style={styles.noTargetCard}>
                <Text variant="body" color={colors.textSecondary}>
                  No nutrient limits set for {activeChild?.name}.
                </Text>
                <Button
                  title="Set limits"
                  size="sm"
                  variant="secondary"
                  style={{ marginTop: spacing.sm }}
                  onPress={() => router.push(`/(app)/children/${activeChildId}`)}
                />
              </Card>
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
            {meal.meal_items.map((item: MealItem & { food: FoodWithNutrients }) => {
              const nutrients = item.computed_nutrients as Record<string, number>;
              // Show the first tracked nutrient's value, falling back to lysine_mg
              const trackedKey = trackedKeys.find((k: string) => nutrients[`${k}_mg`] != null || nutrients[`${k}_g`] != null);
              const displayKey = trackedKey ? `${trackedKey}_mg` : 'lysine_mg';
              const trackedUnit = trackedKey ? getNutrientUnit(trackedKey) : 'mg';
              const trackedAmount = nutrients[displayKey] ?? nutrients[`${trackedKey}_g`];
              return (
                <View key={item.id} style={styles.mealItem}>
                  <Text variant="body" style={{ flex: 1 }}>{item.food?.name}</Text>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {item.amount_grams}g
                  </Text>
                  {trackedAmount != null && (
                    <Text variant="bodySmall" color={colors.primary} style={styles.nutrientBadge}>
                      {Math.round(trackedAmount)} {trackedUnit}
                    </Text>
                  )}
                </View>
              );
            })}
          </Card>
        )}
        ListEmptyComponent={
          activeChildId ? (
            <Card style={styles.emptyMeals}>
              <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
                No meals logged today
              </Text>
              <Button
                title="Log first meal"
                size="sm"
                variant="secondary"
                style={{ marginTop: spacing.sm }}
                onPress={() => router.push('/(app)/diet/log')}
              />
            </Card>
          ) : null
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
  noTargetCard: { alignItems: 'center', backgroundColor: colors.surfaceAlt },
  emptyMeals: { alignItems: 'center', padding: spacing.xl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyText: { textAlign: 'center' },
  list: { padding: spacing.md },
});
