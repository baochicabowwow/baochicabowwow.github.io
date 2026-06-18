import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen, Text, Input, Button, spacing } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useCreateChild } from '../../../src/features/children/useChildren';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  weight_kg: z.coerce.number().positive().optional().nullable(),
  conditions: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function NewChildScreen() {
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
    router.replace(`/(app)/children/${child.id}`);
  }

  return (
    <Screen>
      <Text variant="h2" style={styles.heading}>Add child</Text>

      <View style={styles.form}>
        <Controller control={control} name="name" render={({ field: { onChange, value, onBlur } }) => (
          <Input label="Child's name *" placeholder="Elara" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
        )} />
        <Controller control={control} name="date_of_birth" render={({ field: { onChange, value, onBlur } }) => (
          <Input label="Date of birth *" placeholder="2023-06-01" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.date_of_birth?.message} hint="YYYY-MM-DD" />
        )} />
        <Controller control={control} name="weight_kg" render={({ field: { onChange, value, onBlur } }) => (
          <Input label="Weight (kg)" placeholder="8.5" keyboardType="decimal-pad" value={value != null ? String(value) : ''} onChangeText={onChange} onBlur={onBlur} error={errors.weight_kg?.message} hint="Used to calculate per-kg nutrient targets" />
        )} />
        <Controller control={control} name="conditions" render={({ field: { onChange, value, onBlur } }) => (
          <Input label="Conditions (comma-separated)" placeholder="Pyridoxine-Dependent Epilepsy, ALDH7A1" value={value} onChangeText={onChange} onBlur={onBlur} hint="Optional — for your reference" />
        )} />
        <Button title="Save child" onPress={handleSubmit(onSubmit)} loading={createChild.isPending} style={styles.btn} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: spacing.lg },
  form: { gap: spacing.md },
  btn: { marginTop: spacing.sm },
});
