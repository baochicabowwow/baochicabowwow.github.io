import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen, Card, Text, Input, Button, colors, spacing } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useChildren } from '../../../src/features/children/useChildren';
import { useLogTrackerEvent } from '../../../src/features/trackers/useTrackerEvents';
import {
  useMedications,
  useCreateMedication,
  useUpdateMedication,
  useDeleteMedication,
} from '../../../src/features/trackers/useMedications';
import { Ionicons } from '@expo/vector-icons';
import type { Medication } from '../../../src/lib/database.types';

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  dose: z.string().min(1, 'Dose required'),
  unit: z.string().min(1, 'Unit required'),
  frequency: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const COMMON_UNITS = ['mg', 'mL', 'tablet', 'drops', 'mcg', 'IU'];

export default function MedicationsScreen() {
  const { primaryCircle, user } = useAuth();
  const { data: children } = useChildren(primaryCircle?.id);
  const activeChildId = children?.[0]?.id;

  const { data: medications } = useMedications(activeChildId);
  const createMed = useCreateMedication();
  const updateMed = useUpdateMedication();
  const deleteMed = useDeleteMedication();
  const logEvent = useLogTrackerEvent();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Medication | null>(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { unit: 'mg' },
  });

  function startAdd() {
    setEditing(null);
    reset({ unit: 'mg', name: '', dose: '', frequency: '', notes: '' });
    setShowForm(true);
  }

  function startEdit(med: Medication) {
    setEditing(med);
    reset({ name: med.name, dose: med.dose, unit: med.unit, frequency: med.frequency ?? '', notes: med.notes ?? '' });
    setShowForm(true);
  }

  async function onSubmit(values: FormData) {
    if (!activeChildId || !user) return;
    if (editing) {
      await updateMed.mutateAsync({ id: editing.id, child_id: activeChildId, ...values });
    } else {
      await createMed.mutateAsync({ child_id: activeChildId, created_by: user.id, ...values });
    }
    setShowForm(false);
    setEditing(null);
  }

  async function logDose(med: Medication) {
    if (!activeChildId || !user) return;
    await logEvent.mutateAsync({
      child_id: activeChildId,
      type: 'medicine',
      logged_by: user.id,
      data: { medication_id: med.id, name: med.name, dose: med.dose, unit: med.unit },
    });
    Alert.alert('Logged', `${med.name} ${med.dose}${med.unit} recorded.`);
  }

  function confirmDelete(med: Medication) {
    Alert.alert(
      'Delete medication?',
      `Remove ${med.name} from the list? This won't delete past logged doses.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMed.mutateAsync({ id: med.id, child_id: med.child_id }),
        },
      ],
    );
  }

  async function toggleActive(med: Medication) {
    await updateMed.mutateAsync({ id: med.id, child_id: med.child_id, active: !med.active });
  }

  const active = medications?.filter((m: Medication) => m.active) ?? [];
  const inactive = medications?.filter((m: Medication) => !m.active) ?? [];

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text variant="h2">Medications</Text>
        <Button title="+ Add" size="sm" onPress={startAdd} />
      </View>
      <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
        Save medications here, then tap "Log dose" when given.
      </Text>

      {/* Add / Edit form */}
      {showForm && (
        <Card style={styles.form}>
          <View style={styles.formHeader}>
            <Text variant="label">{editing ? 'Edit medication' : 'Add medication'}</Text>
            <TouchableOpacity onPress={() => { setShowForm(false); setEditing(null); }}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Controller control={control} name="name" render={({ field: { onChange, value, onBlur } }) => (
            <Input label="Medication name *" placeholder="Pyridoxine" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
          )} />

          <View style={styles.doseRow}>
            <Controller control={control} name="dose" render={({ field: { onChange, value, onBlur } }) => (
              <Input containerStyle={{ flex: 1 }} label="Dose *" placeholder="50" keyboardType="decimal-pad" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.dose?.message} />
            )} />
            <Controller control={control} name="unit" render={({ field: { onChange, value } }) => (
              <View style={styles.unitPicker}>
                <Text variant="caption" color={colors.textSecondary} style={styles.unitLabel}>Unit</Text>
                <View style={styles.unitPills}>
                  {COMMON_UNITS.map((u) => (
                    <TouchableOpacity
                      key={u}
                      onPress={() => onChange(u)}
                      style={[styles.unitPill, value === u && styles.unitPillActive]}
                    >
                      <Text variant="caption" color={value === u ? colors.primary : colors.textSecondary}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )} />
          </View>

          <Controller control={control} name="frequency" render={({ field: { onChange, value, onBlur } }) => (
            <Input label="Frequency (optional)" placeholder="twice daily, with food, as needed…" value={value} onChangeText={onChange} onBlur={onBlur} />
          )} />

          <Controller control={control} name="notes" render={({ field: { onChange, value, onBlur } }) => (
            <Input label="Notes (optional)" placeholder="Prescribed by Dr. Smith" value={value} onChangeText={onChange} onBlur={onBlur} />
          )} />

          <View style={styles.formBtns}>
            <Button title="Cancel" variant="ghost" size="sm" onPress={() => { setShowForm(false); setEditing(null); }} />
            <Button title="Save" size="sm" onPress={handleSubmit(onSubmit)} loading={createMed.isPending || updateMed.isPending} />
          </View>
        </Card>
      )}

      {/* Active medications */}
      {active.length > 0 && (
        <View style={styles.section}>
          <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>Active</Text>
          {active.map((med: Medication) => (
            <Card key={med.id} style={styles.medCard}>
              <View style={styles.medHeader}>
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '700' }}>{med.name}</Text>
                  <Text variant="bodySmall" color={colors.primary}>
                    {med.dose} {med.unit}
                    {med.frequency ? ` · ${med.frequency}` : ''}
                  </Text>
                  {med.notes ? <Text variant="caption" color={colors.textMuted}>{med.notes}</Text> : null}
                </View>
                <View style={styles.medActions}>
                  <TouchableOpacity onPress={() => startEdit(med)} style={styles.iconBtn}>
                    <Ionicons name="pencil" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleActive(med)} style={styles.iconBtn}>
                    <Ionicons name="archive-outline" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(med)} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
              <Button
                title={`Log dose: ${med.dose} ${med.unit}`}
                size="sm"
                variant="secondary"
                onPress={() => logDose(med)}
                loading={logEvent.isPending}
              />
            </Card>
          ))}
        </View>
      )}

      {/* Inactive medications */}
      {inactive.length > 0 && (
        <View style={styles.section}>
          <Text variant="label" color={colors.textMuted} style={styles.sectionLabel}>Inactive / discontinued</Text>
          {inactive.map((med: Medication) => (
            <Card key={med.id} style={[styles.medCard, styles.medCardInactive]}>
              <View style={styles.medHeader}>
                <View style={{ flex: 1 }}>
                  <Text variant="body" color={colors.textMuted}>{med.name}</Text>
                  <Text variant="caption" color={colors.textMuted}>{med.dose} {med.unit}</Text>
                </View>
                <View style={styles.medActions}>
                  <TouchableOpacity onPress={() => toggleActive(med)} style={styles.iconBtn}>
                    <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(med)} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {!medications?.length && !showForm && (
        <Card style={styles.empty}>
          <Ionicons name="medical-outline" size={40} color={colors.textMuted} />
          <Text variant="body" color={colors.textMuted} style={{ textAlign: 'center' }}>
            No medications saved yet. Tap "+ Add" to save your first one.
          </Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.md },
  form: { gap: spacing.sm, marginBottom: spacing.md },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  doseRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  unitPicker: { flex: 1 },
  unitLabel: { marginBottom: spacing.xs },
  unitPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  unitPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  unitPillActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  formBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  section: { marginBottom: spacing.md },
  sectionLabel: { marginBottom: spacing.sm },
  medCard: { marginBottom: spacing.sm, gap: spacing.sm },
  medCardInactive: { opacity: 0.6 },
  medHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  medActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  iconBtn: { padding: 4 },
  empty: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
});
