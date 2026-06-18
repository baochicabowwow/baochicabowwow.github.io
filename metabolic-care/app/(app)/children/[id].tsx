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
import { getProfilesForConditions, getNutrientDisplayName, getNutrientUnit } from '../../../src/lib/diseaseProfiles';
import type { NutrientProfile } from '../../../src/lib/diseaseProfiles';
import { useNutrients } from '../../../src/features/diet/useFoods';
import { Ionicons } from '@expo/vector-icons';
import type { ChildNutrientTarget, Nutrient } from '../../../src/lib/database.types';

const weightSchema = z.object({
  weight_kg: z.coerce.number().positive('Enter a positive weight'),
});

const targetSchema = z.object({
  nutrient_key: z.string().min(1, 'Select a nutrient'),
  limit_type: z.enum(['upper', 'lower']),
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
  const router = useRouter();
  const { data: child, isLoading } = useChild(id);
  const { data: targets } = useNutrientTargets(id);
  const { data: allNutrients } = useNutrients();
  const updateChild = useUpdateChild(id);
  const upsertTarget = useUpsertNutrientTarget();
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [editingTarget, setEditingTarget] = useState<ChildNutrientTarget | null>(null);

  const weightForm = useForm<WeightForm>({
    resolver: zodResolver(weightSchema),
    values: { weight_kg: child?.weight_kg ?? 0 },
  });

  const targetForm = useForm<TargetForm>({
    resolver: zodResolver(targetSchema),
    defaultValues: { basis: 'per_kg', limit_type: 'upper', nutrient_key: '' },
  });

  const basis = targetForm.watch('basis');
  const perKgVal = targetForm.watch('per_kg_amount');
  const absVal = targetForm.watch('daily_limit_amount');

  const conditions = Array.isArray(child?.conditions)
    ? (child!.conditions as string[])
    : [];
  const matchedProfiles = getProfilesForConditions(conditions);

  async function saveWeight({ weight_kg }: WeightForm) {
    await updateChild.mutateAsync({ weight_kg });
    Alert.alert('Saved', 'Weight updated.');
  }

  async function saveTarget(values: TargetForm) {
    if (!user) return;
    await upsertTarget.mutateAsync({
      child_id: id,
      nutrient_key: values.nutrient_key,
      limit_type: values.limit_type,
      basis: values.basis,
      daily_limit_amount: values.basis === 'absolute' ? (values.daily_limit_amount ?? null) : null,
      per_kg_amount: values.basis === 'per_kg' ? (values.per_kg_amount ?? null) : null,
      set_by: user.id,
      note: values.note ?? null,
    });
    setShowTargetForm(false);
    setEditingTarget(null);
    targetForm.reset({ basis: 'per_kg', limit_type: 'upper', nutrient_key: '' });
    Alert.alert('Saved', 'Restriction updated.');
  }

  async function applyProfileSuggestions() {
    if (!user || !child) return;
    const nutrients = matchedProfiles.flatMap((p) => p.nutrients);
    for (const n of nutrients) {
      await upsertTarget.mutateAsync({
        child_id: id,
        nutrient_key: n.nutrient_key,
        limit_type: n.limit_type,
        basis: n.default_basis,
        per_kg_amount: n.default_basis === 'per_kg' ? n.typical_per_kg ?? null : null,
        daily_limit_amount: null,
        set_by: user.id,
        note: `Suggested for ${matchedProfiles.map((p) => p.display_name).join(', ')}`,
      });
    }
    Alert.alert('Applied', `${nutrients.length} nutrient restriction(s) set from disease profile.`);
  }

  function startEditTarget(target: ChildNutrientTarget) {
    setEditingTarget(target);
    targetForm.reset({
      nutrient_key: target.nutrient_key,
      limit_type: (target.limit_type as 'upper' | 'lower') ?? 'upper',
      basis: target.basis,
      daily_limit_amount: target.daily_limit_amount ?? undefined,
      per_kg_amount: target.per_kg_amount ?? undefined,
      note: target.note ?? undefined,
    });
    setShowTargetForm(true);
  }

  function startAddTarget() {
    setEditingTarget(null);
    targetForm.reset({ basis: 'per_kg', limit_type: 'upper', nutrient_key: '' });
    setShowTargetForm(true);
  }

  if (isLoading || !child) return null;

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
        {conditions.length > 0 && (
          <Card style={styles.section}>
            <Text variant="label" color={colors.textSecondary}>Conditions</Text>
            {conditions.map((c) => (
              <Text key={c} variant="body">{c}</Text>
            ))}
          </Card>
        )}

        {/* Disease profile suggestions */}
        {matchedProfiles.length > 0 && (
          <Card style={[styles.section, styles.profileCard]}>
            <View style={styles.profileHeader}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text variant="label" color={colors.primary} style={{ flex: 1 }}>
                Detected: {matchedProfiles.map((p) => p.display_name).join(', ')}
              </Text>
            </View>
            <Text variant="bodySmall" color={colors.textSecondary}>
              Suggested restrictions:{' '}
              {matchedProfiles.flatMap((p) => p.nutrients).map((n: NutrientProfile) =>
                `${n.display_name} (${n.limit_type === 'upper' ? 'upper limit' : 'goal'}${n.typical_per_kg ? `, ${n.typical_per_kg} mg/kg/day` : ''})`
              ).join(', ')}
            </Text>
            <Button
              title="Apply suggested restrictions"
              size="sm"
              variant="secondary"
              onPress={applyProfileSuggestions}
              loading={upsertTarget.isPending}
            />
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
                  hint="kg — used to calculate per-kg limits"
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

        {/* Nutrient restrictions */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="label" color={colors.textSecondary}>Nutrient restrictions</Text>
            <TouchableOpacity onPress={startAddTarget}>
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {targets && targets.length > 0 ? (
            targets.map((target: ChildNutrientTarget) => {
              const effectiveLimit = effectiveDailyTarget(
                { nutrient_key: target.nutrient_key, basis: target.basis, daily_limit_amount: target.daily_limit_amount, per_kg_amount: target.per_kg_amount },
                { id: child.id, name: child.name, weight_kg: child.weight_kg },
              );
              const isUpper = (target.limit_type as string) !== 'lower';
              return (
                <View key={target.nutrient_key} style={styles.targetRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.targetNameRow}>
                      <Text variant="body" style={{ fontWeight: '600' }}>
                        {getNutrientDisplayName(target.nutrient_key)}
                      </Text>
                      <View style={[styles.badge, isUpper ? styles.badgeUpper : styles.badgeLower]}>
                        <Text variant="caption" color={isUpper ? colors.danger : colors.success}>
                          {isUpper ? 'UPPER LIMIT' : 'LOWER GOAL'}
                        </Text>
                      </View>
                    </View>
                    {/* Transparent calculation */}
                    {target.basis === 'per_kg' && target.per_kg_amount != null ? (
                      <Text variant="bodySmall" color={colors.textMuted}>
                        {target.per_kg_amount} {getNutrientUnit(target.nutrient_key)}/kg × {child.weight_kg ?? '?'} kg
                        {effectiveLimit != null ? ` = ${Math.round(effectiveLimit)} ${getNutrientUnit(target.nutrient_key)}/day` : ''}
                      </Text>
                    ) : (
                      <Text variant="bodySmall" color={colors.textMuted}>
                        {target.daily_limit_amount} {getNutrientUnit(target.nutrient_key)}/day (fixed)
                      </Text>
                    )}
                    {target.note ? (
                      <Text variant="caption" color={colors.textMuted}>{target.note}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => startEditTarget(target)} style={styles.editBtn}>
                    <Ionicons name="pencil" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <Text variant="body" color={colors.textMuted}>
              No restrictions set yet. Tap + to add one.
            </Text>
          )}

          {/* Add / Edit target form */}
          {showTargetForm && (
            <View style={styles.targetForm}>
              <View style={styles.formTitleRow}>
                <Text variant="label">{editingTarget ? 'Edit restriction' : 'Add restriction'}</Text>
                <TouchableOpacity onPress={() => { setShowTargetForm(false); setEditingTarget(null); }}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Nutrient selector */}
              {!editingTarget && (
                <Controller
                  control={targetForm.control}
                  name="nutrient_key"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.field}>
                      <Text variant="label">Nutrient</Text>
                      <View style={styles.pillGrid}>
                        {(allNutrients ?? []).map((n: Nutrient) => (
                          <TouchableOpacity
                            key={n.key}
                            onPress={() => onChange(n.key)}
                            style={[styles.selectPill, value === n.key && styles.selectPillActive]}
                          >
                            <Text
                              variant="caption"
                              color={value === n.key ? colors.primary : colors.textSecondary}
                              style={{ fontWeight: value === n.key ? '700' : '400' }}
                            >
                              {n.display_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {targetForm.formState.errors.nutrient_key && (
                        <Text variant="caption" color={colors.danger}>
                          {targetForm.formState.errors.nutrient_key.message}
                        </Text>
                      )}
                    </View>
                  )}
                />
              )}

              {/* Limit type */}
              <Controller
                control={targetForm.control}
                name="limit_type"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.field}>
                    <Text variant="label">Type</Text>
                    <View style={styles.basisSelector}>
                      {([['upper', 'Upper limit (do not exceed)'], ['lower', 'Lower goal (must reach)']] as const).map(([v, label]) => (
                        <TouchableOpacity
                          key={v}
                          onPress={() => onChange(v)}
                          style={[styles.basisBtn, value === v && styles.basisBtnActive]}
                        >
                          <Text
                            variant="bodySmall"
                            color={value === v ? colors.primary : colors.textSecondary}
                            style={{ fontWeight: value === v ? '700' : '400' }}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              />

              {/* Basis */}
              <Controller
                control={targetForm.control}
                name="basis"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.field}>
                    <Text variant="label">Calculation method</Text>
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
                            {b === 'per_kg' ? 'Per kg/day (recommended)' : 'Fixed mg/day'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              />

              {basis === 'per_kg' ? (
                <Controller
                  control={targetForm.control}
                  name="per_kg_amount"
                  render={({ field: { onChange, value, onBlur } }) => (
                    <Input
                      label="Amount per kg per day"
                      keyboardType="decimal-pad"
                      placeholder="e.g. 100"
                      value={value != null ? String(value) : ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      hint={child.weight_kg
                        ? `= ${Math.round((Number(value) || 0) * child.weight_kg)} ${getNutrientUnit(targetForm.watch('nutrient_key'))}/day at current weight (${child.weight_kg} kg)`
                        : 'Set weight above to see effective daily amount'}
                    />
                  )}
                />
              ) : (
                <Controller
                  control={targetForm.control}
                  name="daily_limit_amount"
                  render={({ field: { onChange, value, onBlur } }) => (
                    <Input
                      label="Fixed daily amount"
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
                title="Save restriction"
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
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  profileCard: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  targetRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  targetNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeUpper: { backgroundColor: '#fee2e2' },
  badgeLower: { backgroundColor: '#dcfce7' },
  editBtn: { padding: spacing.xs },
  targetForm: { marginTop: spacing.md, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  formTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  field: { gap: spacing.xs },
  basisSelector: { gap: spacing.xs },
  basisBtn: { padding: spacing.sm, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  basisBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  selectPill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  selectPillActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
});
