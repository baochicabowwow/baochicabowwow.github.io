import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen, Card, Text, Input, Button, colors, spacing } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useChild, useUpdateChild } from '../../../src/features/children/useChildren';
import { useNutrientTargets, useUpsertNutrientTarget } from '../../../src/features/children/useNutrientTargets';
import { effectiveDailyTarget } from '../../../src/domain/nutrition/calculations';
import { Ionicons } from '@expo/vector-icons';

const weightSchema = z.object({
  weight_kg: z.coerce.number().positive('Enter a positive weight'),
});
const targetSchema = z.object({
  basis: z.enum(['absolute', 'per_kg']),
  daily_limit_amount: z.coerce.number().nonnegative().optional().nullable(),
  per_kg_amount: z.coerce.number().nonnegative().optional().nullable(),
  note: z.string().optional(),
});
type WeightForm = z.infer<typeof weightSchema>;
type TargetForm = z.infer<typeof targetSchema>;

export default function ChildDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: child, isLoading } = useChild(id);
  const { data: targets } = useNutrientTargets(id);
  const updateChild = useUpdateChild(id);
  const upsertTarget = useUpsertNutrientTarget();
  const [showTargetForm, setShowTargetForm] = useState(false);

  const weightForm = useForm<WeightForm>({
    resolver: zodResolver(weightSchema),
    values: { weight_kg: child?.weight_kg ?? 0 },
  });

  const targetForm = useForm<TargetForm>({
    resolver: zodResolver(targetSchema),
    defaultValues: { basis: 'per_kg' },
  });

  const basis = targetForm.watch('basis');

  async function saveWeight({ weight_kg }: WeightForm) {
    await updateChild.mutateAsync({ weight_kg });
    Alert.alert('Saved', 'Weight updated.');
  }

  async function saveTarget(values: TargetForm) {
    if (!user) return;
    await upsertTarget.mutateAsync({
      child_id: id,
      nutrient_key: 'lysine',
      basis: values.basis,
      daily_limit_amount: values.basis === 'absolute' ? (values.daily_limit_amount ?? null) : null,
      per_kg_amount: values.basis === 'per_kg' ? (values.per_kg_amount ?? null) : null,
      set_by: user.id,
      note: values.note ?? null,
    });
    setShowTargetForm(false);
    Alert.alert('Saved', 'Lysine target updated.');
  }

  if (isLoading || !child) return null;

  const lysineTarget = targets?.find((t) => t.nutrient_key === 'lysine');
  const effectiveLimit = lysineTarget ? effectiveDailyTarget(
    { nutrient_key: 'lysine', basis: lysineTarget.basis, daily_limit_amount: lysineTarget.daily_limit_amount, per_kg_amount: lysineTarget.per_kg_amount },
    { id: child.id, name: child.name, weight_kg: child.weight_kg },
  ) : null;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text variant="h1" color={colors.primary}>{child.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text variant="h2">{child.name}</Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              Born {new Date(child.date_of_birth).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Conditions */}
        {Array.isArray(child.conditions) && child.conditions.length > 0 && (
          <Card style={styles.section}>
            <Text variant="label" color={colors.textSecondary}>Conditions</Text>
            {(child.conditions as string[]).map((c) => (
              <Text key={c} variant="body">{c}</Text>
            ))}
          </Card>
        )}

        {/* Weight */}
        <Card style={styles.section}>
          <Text variant="label" color={colors.textSecondary}>Weight</Text>
          <View style={styles.row}>
            <Controller
              control={weightForm.control}
              name="weight_kg"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input
                  containerStyle={{ flex: 1 }}
                  placeholder="8.5"
                  keyboardType="decimal-pad"
                  value={String(value ?? '')}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={weightForm.formState.errors.weight_kg?.message}
                  hint="kg"
                />
              )}
            />
            <Button
              title="Save"
              size="sm"
              style={{ marginLeft: spacing.sm, alignSelf: 'flex-start', marginTop: 18 }}
              onPress={weightForm.handleSubmit(saveWeight)}
              loading={updateChild.isPending}
            />
          </View>
        </Card>

        {/* Lysine target */}
        <Card style={styles.section}>
          <View style={styles.targetHeader}>
            <Text variant="label" color={colors.textSecondary}>Lysine target</Text>
            <TouchableOpacity onPress={() => setShowTargetForm(!showTargetForm)}>
              <Ionicons name={showTargetForm ? 'close' : 'pencil'} size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {lysineTarget ? (
            <View style={styles.targetInfo}>
              <Text variant="body">
                {lysineTarget.basis === 'per_kg'
                  ? `${lysineTarget.per_kg_amount} mg/kg/day`
                  : `${lysineTarget.daily_limit_amount} mg/day`}
              </Text>
              {effectiveLimit != null && (
                <Text variant="bodySmall" color={colors.primary}>
                  = {Math.round(effectiveLimit)} mg/day for {child.weight_kg} kg
                </Text>
              )}
              {lysineTarget.note && (
                <Text variant="bodySmall" color={colors.textMuted}>{lysineTarget.note}</Text>
              )}
            </View>
          ) : (
            <Text variant="body" color={colors.textMuted}>No lysine target set</Text>
          )}

          {showTargetForm && (
            <View style={styles.targetForm}>
              {/* Basis selector */}
              <Text variant="label">Calculation method</Text>
              <Controller
                control={targetForm.control}
                name="basis"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.basisSelector}>
                    {(['per_kg', 'absolute'] as const).map((b) => (
                      <TouchableOpacity
                        key={b}
                        onPress={() => onChange(b)}
                        style={[styles.basisBtn, value === b && styles.basisBtnActive]}
                      >
                        <Text
                          variant="bodySmall"
                          color={value === b ? colors.primary : colors.textSecondary}
                          style={{ fontWeight: value === b ? '700' : '400' }}
                        >
                          {b === 'per_kg' ? 'Per kg/day (recommended)' : 'Absolute mg/day'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />

              {basis === 'per_kg' ? (
                <Controller
                  control={targetForm.control}
                  name="per_kg_amount"
                  render={({ field: { onChange, value, onBlur } }) => (
                    <Input
                      label="mg lysine per kg per day"
                      keyboardType="decimal-pad"
                      placeholder="e.g. 100"
                      value={value != null ? String(value) : ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      hint={child.weight_kg ? `= ${Math.round((Number(value) || 0) * child.weight_kg)} mg/day at current weight` : undefined}
                    />
                  )}
                />
              ) : (
                <Controller
                  control={targetForm.control}
                  name="daily_limit_amount"
                  render={({ field: { onChange, value, onBlur } }) => (
                    <Input
                      label="Daily lysine limit (mg)"
                      keyboardType="decimal-pad"
                      placeholder="e.g. 800"
                      value={value != null ? String(value) : ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                    />
                  )}
                />
              )}

              <Controller
                control={targetForm.control}
                name="note"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="Note (optional)"
                    placeholder="Set by Dr. Smith on..."
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                )}
              />

              <Button
                title="Save target"
                onPress={targetForm.handleSubmit(saveTarget)}
                loading={upsertTarget.isPending}
              />
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  targetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  targetInfo: { gap: spacing.xs },
  targetForm: { marginTop: spacing.sm, gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  basisSelector: { gap: spacing.xs },
  basisBtn: { padding: spacing.sm, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  basisBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
});
