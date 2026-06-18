import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen, Text, Input, Button, Card, colors, spacing } from '../../src/components/ui';
import { useAuth } from '../../src/features/auth/AuthContext';
import { useCreateChild } from '../../src/features/children/useChildren';
import { getProfilesForConditions } from '../../src/lib/diseaseProfiles';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  weight_kg: z.coerce.number().positive('Enter a positive weight').optional().nullable(),
  conditions: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const CONDITION_HINTS = ['Pyridoxine-Dependent Epilepsy (PDE)', 'PKU', 'MSUD', 'HCU', 'GA1', 'Isovaleric Acidemia'];

export default function OnboardingChild() {
  const { primaryCircle } = useAuth();
  const router = useRouter();
  const createChild = useCreateChild();

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit({ conditions, ...data }: FormData) {
    if (!primaryCircle) return;
    const conditionsList = conditions
      ? conditions.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

    const child = await createChild.mutateAsync({
      care_circle_id: primaryCircle.id,
      ...data,
      conditions: conditionsList,
    });

    const profiles = getProfilesForConditions(conditionsList);
    if (profiles.length > 0) {
      router.replace({ pathname: '/(onboarding)/targets', params: { childId: child.id, weight: String(data.weight_kg ?? '') } });
    } else {
      router.replace({ pathname: '/(onboarding)/done', params: { childId: child.id, childName: child.name } });
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="h2">Tell us about your child</Text>
        <Text variant="body" color={colors.textSecondary}>
          We'll use this to personalise their nutrient limits.
        </Text>
      </View>

      <View style={styles.form}>
        <Controller control={control} name="name" render={({ field: { onChange, value, onBlur } }) => (
          <Input
            label="Child's name *"
            placeholder="Elara"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.name?.message}
          />
        )} />

        <Controller control={control} name="date_of_birth" render={({ field: { onChange, value, onBlur } }) => (
          <Input
            label="Date of birth *"
            placeholder="2023-06-01"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.date_of_birth?.message}
            hint="YYYY-MM-DD"
          />
        )} />

        <Controller control={control} name="weight_kg" render={({ field: { onChange, value, onBlur } }) => (
          <Input
            label="Current weight (kg)"
            placeholder="8.5"
            keyboardType="decimal-pad"
            value={value != null ? String(value) : ''}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.weight_kg?.message}
            hint="Used to calculate per-kg nutrient limits"
          />
        )} />

        <Controller control={control} name="conditions" render={({ field: { onChange, value, onBlur } }) => (
          <Input
            label="Metabolic conditions (comma-separated)"
            placeholder="Pyridoxine-Dependent Epilepsy, ALDH7A1"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            hint="We'll suggest appropriate nutrient limits"
          />
        )} />

        <Card style={styles.hintCard}>
          <Text variant="caption" color={colors.textMuted}>Common conditions we support:</Text>
          <Text variant="caption" color={colors.textMuted}>{CONDITION_HINTS.join(' · ')}</Text>
        </Card>

        <Button
          title="Next"
          onPress={handleSubmit(onSubmit)}
          loading={createChild.isPending}
          style={styles.btn}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginBottom: spacing.xl },
  form: { gap: spacing.md },
  hintCard: { backgroundColor: colors.surfaceAlt },
  btn: { marginTop: spacing.sm },
});
