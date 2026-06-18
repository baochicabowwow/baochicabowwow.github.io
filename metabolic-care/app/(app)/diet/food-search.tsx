import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Text, Input, Button, colors, spacing } from '../../../src/components/ui';
import { useFoodSearch, useCreateFood } from '../../../src/features/diet/useFoods';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const newFoodSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  brand: z.string().optional(),
  lysine_mg_per_100g: z.coerce.number().nonnegative('Must be 0 or more'),
  protein_g_per_100g: z.coerce.number().nonnegative().optional(),
  energy_kcal_per_100g: z.coerce.number().nonnegative().optional(),
  default_serving_g: z.coerce.number().positive().default(100),
});
type NewFoodForm = z.infer<typeof newFoodSchema>;

export default function FoodSearchScreen() {
  const { primaryCircle, user } = useAuth();
  const [query, setQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: results } = useFoodSearch(query, primaryCircle?.id);
  const createFood = useCreateFood();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<NewFoodForm>({
    resolver: zodResolver(newFoodSchema),
    defaultValues: { default_serving_g: 100 },
  });

  async function onAddFood(values: NewFoodForm) {
    if (!primaryCircle || !user) return;
    const nutrients = [{ nutrient_key: 'lysine', amount_per_100g: values.lysine_mg_per_100g }];
    if (values.protein_g_per_100g != null) nutrients.push({ nutrient_key: 'protein', amount_per_100g: values.protein_g_per_100g });
    if (values.energy_kcal_per_100g != null) nutrients.push({ nutrient_key: 'energy', amount_per_100g: values.energy_kcal_per_100g });

    await createFood.mutateAsync({
      care_circle_id: primaryCircle.id,
      name: values.name,
      brand: values.brand ?? null,
      source: 'custom',
      default_serving_g: values.default_serving_g,
      created_by: user.id,
      nutrients,
    });

    Alert.alert('Food added!', `${values.name} is now in your food list.`);
    reset();
    setShowAddForm(false);
  }

  return (
    <Screen>
      <Input
        placeholder="Search foods..."
        value={query}
        onChangeText={setQuery}
        containerStyle={styles.search}
      />

      {results && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const lysine = item.food_nutrients.find((n) => n.nutrient_key === 'lysine');
            const protein = item.food_nutrients.find((n) => n.nutrient_key === 'protein');
            return (
              <Card style={styles.foodCard}>
                <View style={styles.foodRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" style={{ fontWeight: '600' }}>{item.name}</Text>
                    {item.brand && <Text variant="caption" color={colors.textMuted}>{item.brand}</Text>}
                  </View>
                  <View style={styles.nutrients}>
                    {lysine && (
                      <Text variant="bodySmall" color={colors.primary}>
                        {lysine.amount_per_100g} mg lysine/100g
                      </Text>
                    )}
                    {protein && (
                      <Text variant="caption" color={colors.textMuted}>
                        {protein.amount_per_100g}g protein/100g
                      </Text>
                    )}
                  </View>
                </View>
              </Card>
            );
          }}
          scrollEnabled={false}
          ListEmptyComponent={
            query.length >= 2 ? (
              <Text variant="body" color={colors.textMuted} style={styles.empty}>No foods found</Text>
            ) : null
          }
        />
      )}

      <Button
        title={showAddForm ? 'Cancel' : '+ Add custom food'}
        variant="secondary"
        style={styles.addBtn}
        onPress={() => setShowAddForm(!showAddForm)}
      />

      {showAddForm && (
        <Card style={styles.addForm}>
          <Text variant="h3">Add custom food</Text>
          <Controller control={control} name="name" render={({ field: { onChange, value, onBlur } }) => (
            <Input label="Food name *" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
          )} />
          <Controller control={control} name="brand" render={({ field: { onChange, value, onBlur } }) => (
            <Input label="Brand (optional)" value={value} onChangeText={onChange} onBlur={onBlur} />
          )} />
          <Controller control={control} name="lysine_mg_per_100g" render={({ field: { onChange, value, onBlur } }) => (
            <Input label="Lysine (mg per 100g) *" keyboardType="decimal-pad" value={String(value ?? '')} onChangeText={onChange} onBlur={onBlur} error={errors.lysine_mg_per_100g?.message} />
          )} />
          <Controller control={control} name="protein_g_per_100g" render={({ field: { onChange, value, onBlur } }) => (
            <Input label="Protein (g per 100g)" keyboardType="decimal-pad" value={String(value ?? '')} onChangeText={onChange} onBlur={onBlur} />
          )} />
          <Controller control={control} name="energy_kcal_per_100g" render={({ field: { onChange, value, onBlur } }) => (
            <Input label="Energy (kcal per 100g)" keyboardType="decimal-pad" value={String(value ?? '')} onChangeText={onChange} onBlur={onBlur} />
          )} />
          <Controller control={control} name="default_serving_g" render={({ field: { onChange, value, onBlur } }) => (
            <Input label="Default serving (g)" keyboardType="decimal-pad" value={String(value ?? '')} onChangeText={onChange} onBlur={onBlur} error={errors.default_serving_g?.message} />
          )} />
          <Button title="Save food" onPress={handleSubmit(onAddFood)} loading={createFood.isPending} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { marginBottom: spacing.md },
  foodCard: { marginBottom: spacing.sm },
  foodRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  nutrients: { alignItems: 'flex-end', gap: 2 },
  empty: { textAlign: 'center', padding: spacing.lg },
  addBtn: { marginTop: spacing.md },
  addForm: { marginTop: spacing.md, gap: spacing.sm },
});
