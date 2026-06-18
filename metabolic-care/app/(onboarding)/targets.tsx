import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, Text, Input, Button, colors, spacing } from '../../src/components/ui';
import { useAuth } from '../../src/features/auth/AuthContext';
import { useChild } from '../../src/features/children/useChildren';
import { useUpsertNutrientTarget } from '../../src/features/children/useNutrientTargets';
import { getProfilesForConditions, type NutrientProfile } from '../../src/lib/diseaseProfiles';

export default function OnboardingTargets() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { data: child } = useChild(childId);
  const upsertTarget = useUpsertNutrientTarget();

  const conditions = Array.isArray(child?.conditions) ? (child!.conditions as string[]) : [];
  const profiles = getProfilesForConditions(conditions);
  const suggestedNutrients = profiles.flatMap((p) => p.nutrients);

  const [amounts, setAmounts] = useState<Record<string, string>>({});

  function getAmount(n: NutrientProfile): string {
    if (amounts[n.nutrient_key] !== undefined) return amounts[n.nutrient_key];
    return n.typical_per_kg != null ? String(n.typical_per_kg) : '';
  }

  function effectiveDaily(n: NutrientProfile): number | null {
    const val = parseFloat(getAmount(n));
    if (!val || !child?.weight_kg) return null;
    return val * child.weight_kg;
  }

  async function applyAll() {
    if (!user || !child) return;
    for (const n of suggestedNutrients) {
      const perKg = parseFloat(getAmount(n));
      if (!perKg) {
        Alert.alert('Missing value', `Enter a value for ${n.display_name}`);
        return;
      }
      await upsertTarget.mutateAsync({
        child_id: childId,
        nutrient_key: n.nutrient_key,
        limit_type: n.limit_type,
        basis: n.default_basis,
        per_kg_amount: n.default_basis === 'per_kg' ? perKg : null,
        daily_limit_amount: n.default_basis === 'absolute' ? perKg : null,
        set_by: user.id,
        note: `Set during onboarding — ${profiles.map((p) => p.display_name).join(', ')}`,
      });
    }
    router.replace({ pathname: '/(onboarding)/done', params: { childId, childName: child.name } });
  }

  if (!child) return null;

  return (
    <Screen>
      <Text variant="h2" style={styles.heading}>Set nutrient limits</Text>
      <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
        Based on{' '}
        <Text variant="body" style={{ fontWeight: '700' }}>
          {profiles.map((p) => p.display_name).join(', ')}
        </Text>
        , we suggest these restrictions. You can adjust the values — your dietitian will
        give you exact numbers.
      </Text>

      <View style={styles.targets}>
        {suggestedNutrients.map((n) => {
          const daily = effectiveDaily(n);
          return (
            <Card key={n.nutrient_key} style={styles.targetCard}>
              <View style={styles.targetHeader}>
                <Text variant="label">{n.display_name}</Text>
                <Text variant="caption" color={n.limit_type === 'upper' ? colors.danger : colors.success}>
                  {n.limit_type === 'upper' ? 'Upper limit — do not exceed' : 'Daily goal — must reach'}
                </Text>
              </View>
              <Text variant="bodySmall" color={colors.textSecondary}>{n.description}</Text>

              <View style={styles.inputRow}>
                <Input
                  containerStyle={{ flex: 1 }}
                  label={`mg per kg per day`}
                  keyboardType="decimal-pad"
                  value={getAmount(n)}
                  onChangeText={(v) => setAmounts((prev) => ({ ...prev, [n.nutrient_key]: v }))}
                  hint={daily != null
                    ? `= ${Math.round(daily)} mg/day at ${child.weight_kg} kg`
                    : child.weight_kg ? 'Enter a value to see daily total' : 'Set weight to see daily total'}
                />
              </View>
            </Card>
          );
        })}
      </View>

      <Button
        title={`Apply ${suggestedNutrients.length} restriction${suggestedNutrients.length !== 1 ? 's' : ''}`}
        onPress={applyAll}
        loading={upsertTarget.isPending}
        style={styles.btn}
      />
      <Button
        title="Skip for now"
        variant="ghost"
        onPress={() => router.replace({ pathname: '/(onboarding)/done', params: { childId, childName: child.name } })}
        style={styles.skip}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.lg },
  targets: { gap: spacing.md, marginBottom: spacing.lg },
  targetCard: { gap: spacing.sm },
  targetHeader: { gap: 2 },
  inputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  btn: {},
  skip: { marginTop: spacing.sm },
});
