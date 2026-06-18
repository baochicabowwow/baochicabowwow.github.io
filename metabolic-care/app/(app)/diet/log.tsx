import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen, Card, Text, Button, Input, colors, spacing } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useChildren } from '../../../src/features/children/useChildren';
import { useNutrientTargets } from '../../../src/features/children/useNutrientTargets';
import { useFoodSearch, useCreateFood } from '../../../src/features/diet/useFoods';
import { useLogMeal, useRecentMeals } from '../../../src/features/diet/useMeals';
import { calculateItemNutrients } from '../../../src/domain/nutrition/calculations';
import { getNutrientDisplayName, getNutrientUnit } from '../../../src/lib/diseaseProfiles';
import { Ionicons } from '@expo/vector-icons';
import type { FoodWithNutrients } from '../../../src/features/diet/useFoods';
import type { MealWithItems } from '../../../src/features/diet/useMeals';
import type { MealItem, FoodNutrient } from '../../../src/lib/database.types';

const mealSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'formula', 'supplement']),
  note: z.string().optional(),
});
type MealForm = z.infer<typeof mealSchema>;

const newFoodSchema = z.object({
  name: z.string().min(1, 'Name required'),
  brand: z.string().optional(),
  lysine_mg_per_100g: z.coerce.number().min(0, 'Enter 0 if no lysine'),
  protein_g_per_100g: z.coerce.number().min(0).optional(),
  energy_kcal_per_100g: z.coerce.number().min(0).optional(),
  default_serving_g: z.coerce.number().positive().default(100),
});
type NewFoodForm = z.infer<typeof newFoodSchema>;

interface PendingItem {
  food: FoodWithNutrients;
  amount_grams: number;
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'formula', 'supplement'] as const;

export default function LogMealScreen() {
  const router = useRouter();
  const { primaryCircle, user } = useAuth();
  const { data: children } = useChildren(primaryCircle?.id);
  const [selectedChildId] = useState(children?.[0]?.id);
  const { data: targets } = useNutrientTargets(selectedChildId);

  const [foodQuery, setFoodQuery] = useState('');
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [addingFood, setAddingFood] = useState<FoodWithNutrients | null>(null);
  const [amountInput, setAmountInput] = useState('');

  const [showRepeat, setShowRepeat] = useState(false);
  const [showNewFood, setShowNewFood] = useState(false);

  const { data: searchResults } = useFoodSearch(foodQuery, primaryCircle?.id);
  const { data: recentMeals } = useRecentMeals(selectedChildId);
  const logMeal = useLogMeal();
  const createFood = useCreateFood();

  const { control, handleSubmit } = useForm<MealForm>({
    resolver: zodResolver(mealSchema),
    defaultValues: { mealType: 'snack' },
  });

  const newFoodForm = useForm<NewFoodForm>({
    resolver: zodResolver(newFoodSchema),
    defaultValues: { default_serving_g: 100, lysine_mg_per_100g: 0 },
  });

  // Primary tracked nutrient key (first target)
  const primaryKey = targets?.[0]?.nutrient_key ?? 'lysine';
  const primaryResultKey = `${primaryKey}_mg`;
  const primaryUnit = getNutrientUnit(primaryKey);
  const primaryLabel = getNutrientDisplayName(primaryKey);

  function getNutrientFromComputed(computed: Record<string, number>, key: string): number {
    return computed[`${key}_mg`] ?? computed[`${key}_g`] ?? 0;
  }

  function addItem() {
    if (!addingFood) return;
    const grams = parseFloat(amountInput);
    if (!grams || grams <= 0) { Alert.alert('Enter a valid amount'); return; }
    setPendingItems((prev) => [...prev, { food: addingFood, amount_grams: grams }]);
    setAddingFood(null);
    setAmountInput('');
    setFoodQuery('');
  }

  function removeItem(index: number) {
    setPendingItems((prev) => prev.filter((_, i) => i !== index));
  }

  function repeatMeal(meal: MealWithItems) {
    const items: PendingItem[] = meal.meal_items.map((mi) => ({
      food: mi.food as FoodWithNutrients,
      amount_grams: mi.amount_grams,
    }));
    setPendingItems(items);
    setShowRepeat(false);
  }

  async function createAndAddFood(values: NewFoodForm) {
    if (!primaryCircle || !user) return;
    const food = await createFood.mutateAsync({
      care_circle_id: primaryCircle.id,
      name: values.name,
      brand: values.brand || null,
      source: 'custom',
      default_serving_g: values.default_serving_g,
      created_by: user.id,
      nutrients: [
        { nutrient_key: 'lysine', amount_per_100g: values.lysine_mg_per_100g },
        ...(values.protein_g_per_100g != null ? [{ nutrient_key: 'protein', amount_per_100g: values.protein_g_per_100g }] : []),
        ...(values.energy_kcal_per_100g != null ? [{ nutrient_key: 'energy', amount_per_100g: values.energy_kcal_per_100g }] : []),
      ],
    });
    // Add to pending with default serving
    const foodWithNutrients: FoodWithNutrients = {
      ...food,
      food_nutrients: [
        { food_id: food.id, nutrient_key: 'lysine', amount_per_100g: values.lysine_mg_per_100g },
        ...(values.protein_g_per_100g != null ? [{ food_id: food.id, nutrient_key: 'protein', amount_per_100g: values.protein_g_per_100g }] : []),
        ...(values.energy_kcal_per_100g != null ? [{ food_id: food.id, nutrient_key: 'energy', amount_per_100g: values.energy_kcal_per_100g }] : []),
      ],
      food_servings: [],
    };
    setPendingItems((prev) => [...prev, { food: foodWithNutrients, amount_grams: values.default_serving_g }]);
    setShowNewFood(false);
    newFoodForm.reset({ default_serving_g: 100, lysine_mg_per_100g: 0 });
  }

  async function onSubmit({ mealType, note }: MealForm) {
    if (!pendingItems.length) { Alert.alert('Add at least one food item'); return; }
    if (!selectedChildId || !user) return;
    await logMeal.mutateAsync({
      child_id: selectedChildId,
      logged_by: user.id,
      meal_type: mealType,
      note: note || null,
      items: pendingItems,
    });
    router.back();
  }

  function getTotalPrimary() {
    return pendingItems.reduce((sum, item) => {
      const n = calculateItemNutrients(
        { id: item.food.id, name: item.food.name, default_serving_g: item.food.default_serving_g, food_nutrients: item.food.food_nutrients.map(fn => ({ nutrient_key: fn.nutrient_key, amount_per_100g: fn.amount_per_100g })) },
        item.amount_grams,
      );
      return sum + (n[primaryResultKey] ?? 0);
    }, 0);
  }

  return (
    <Screen>
      <Text variant="h2" style={styles.heading}>Log Meal</Text>

      {/* Meal type selector */}
      <Text variant="label" style={styles.label}>Meal type</Text>
      <Controller
        control={control}
        name="mealType"
        render={({ field: { onChange, value } }) => (
          <View style={styles.mealTypes}>
            {MEAL_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => onChange(type)}
                style={[styles.mealTypeBtn, value === type && styles.mealTypeBtnActive]}
              >
                <Text
                  variant="bodySmall"
                  color={value === type ? colors.primary : colors.textSecondary}
                  style={{ fontWeight: value === type ? '700' : '400', textTransform: 'capitalize' }}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />

      {/* Repeat past meal */}
      <TouchableOpacity
        onPress={() => setShowRepeat(!showRepeat)}
        style={styles.repeatToggle}
      >
        <Ionicons name="time-outline" size={16} color={colors.primary} />
        <Text variant="bodySmall" color={colors.primary} style={{ fontWeight: '600' }}>
          {showRepeat ? 'Hide' : 'Repeat a past meal'}
        </Text>
      </TouchableOpacity>

      {showRepeat && recentMeals && recentMeals.length > 0 && (
        <Card padded={false} style={styles.repeatCard}>
          {recentMeals.slice(0, 8).map((meal: MealWithItems) => {
            const totalPrimary = meal.meal_items.reduce((s: number, mi: MealItem & { food: FoodWithNutrients }) => {
              const c = mi.computed_nutrients as Record<string, number>;
              return s + (c[primaryResultKey] ?? 0);
            }, 0);
            return (
              <TouchableOpacity key={meal.id} style={styles.repeatItem} onPress={() => repeatMeal(meal)}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodySmall" style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                    {meal.meal_type ?? 'Meal'} · {meal.meal_items.length} item{meal.meal_items.length !== 1 ? 's' : ''}
                  </Text>
                  <Text variant="caption" color={colors.textMuted}>
                    {new Date(meal.logged_at).toLocaleDateString()}
                    {totalPrimary > 0 ? ` · ${Math.round(totalPrimary)} ${primaryUnit} ${primaryLabel.toLowerCase()}` : ''}
                  </Text>
                </View>
                <Ionicons name="copy-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
            );
          })}
        </Card>
      )}

      {showRepeat && recentMeals?.length === 0 && (
        <Text variant="bodySmall" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
          No past meals yet.
        </Text>
      )}

      {/* Food search */}
      <Text variant="label" style={styles.label}>Add foods</Text>
      <Input
        placeholder="Search foods (e.g. chicken, rice...)"
        value={foodQuery}
        onChangeText={setFoodQuery}
        containerStyle={styles.searchInput}
      />

      {/* Search results */}
      {foodQuery.length >= 2 && searchResults && (
        <Card padded={false} style={styles.searchResults}>
          {searchResults.slice(0, 8).map((food: FoodWithNutrients) => {
            const lysineNutrient = food.food_nutrients.find((n: FoodNutrient) => n.nutrient_key === 'lysine');
            const hasLysine = lysineNutrient != null;
            return (
              <TouchableOpacity
                key={food.id}
                style={styles.searchItem}
                onPress={() => {
                  setAddingFood(food);
                  setAmountInput(String(food.default_serving_g));
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="body">{food.name}</Text>
                  {food.brand && <Text variant="caption" color={colors.textMuted}>{food.brand}</Text>}
                </View>
                {hasLysine ? (
                  <Text variant="caption" color={colors.primary}>
                    {lysineNutrient.amount_per_100g} mg/100g
                  </Text>
                ) : (
                  <Text variant="caption" color={colors.warning}>No lysine data</Text>
                )}
              </TouchableOpacity>
            );
          })}
          {searchResults.length === 0 && (
            <View style={styles.noResults}>
              <Text variant="bodySmall" color={colors.textMuted}>No foods found.</Text>
            </View>
          )}
        </Card>
      )}

      {/* Can't find it? — add custom food */}
      {foodQuery.length >= 2 && (
        <TouchableOpacity
          onPress={() => { setShowNewFood(true); setFoodQuery(''); }}
          style={styles.addCustom}
        >
          <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
          <Text variant="bodySmall" color={colors.primary} style={{ fontWeight: '600' }}>
            Can't find it? Add a custom food
          </Text>
        </TouchableOpacity>
      )}

      {/* Inline new food form */}
      {showNewFood && (
        <Card style={styles.newFoodCard}>
          <View style={styles.newFoodHeader}>
            <Text variant="label">Add custom food</Text>
            <TouchableOpacity onPress={() => setShowNewFood(false)}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Controller control={newFoodForm.control} name="name" render={({ field: { onChange, value, onBlur } }) => (
            <Input label="Food name *" placeholder="Mystery grain" value={value} onChangeText={onChange} onBlur={onBlur} error={newFoodForm.formState.errors.name?.message} />
          )} />
          <Controller control={newFoodForm.control} name="brand" render={({ field: { onChange, value, onBlur } }) => (
            <Input label="Brand (optional)" placeholder="Brand name" value={value} onChangeText={onChange} onBlur={onBlur} />
          )} />
          <Controller control={newFoodForm.control} name="lysine_mg_per_100g" render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Lysine (mg per 100g) *"
              keyboardType="decimal-pad"
              placeholder="e.g. 450"
              value={value != null ? String(value) : ''}
              onChangeText={onChange}
              onBlur={onBlur}
              error={newFoodForm.formState.errors.lysine_mg_per_100g?.message}
              hint="Check the food's nutritional label or ask your dietitian"
            />
          )} />
          <Controller control={newFoodForm.control} name="protein_g_per_100g" render={({ field: { onChange, value, onBlur } }) => (
            <Input label="Protein (g per 100g)" keyboardType="decimal-pad" placeholder="optional" value={value != null ? String(value) : ''} onChangeText={onChange} onBlur={onBlur} />
          )} />
          <Controller control={newFoodForm.control} name="energy_kcal_per_100g" render={({ field: { onChange, value, onBlur } }) => (
            <Input label="Energy (kcal per 100g)" keyboardType="decimal-pad" placeholder="optional" value={value != null ? String(value) : ''} onChangeText={onChange} onBlur={onBlur} />
          )} />
          <Controller control={newFoodForm.control} name="default_serving_g" render={({ field: { onChange, value, onBlur } }) => (
            <Input label="Default serving (g)" keyboardType="decimal-pad" value={String(value ?? 100)} onChangeText={onChange} onBlur={onBlur} />
          )} />
          <View style={styles.newFoodBtns}>
            <Button title="Cancel" variant="ghost" size="sm" onPress={() => setShowNewFood(false)} />
            <Button title="Save & add to meal" size="sm" onPress={newFoodForm.handleSubmit(createAndAddFood)} loading={createFood.isPending} />
          </View>
        </Card>
      )}

      {/* Amount entry */}
      {addingFood && (
        <Card style={styles.amountCard}>
          <Text variant="h3">{addingFood.name}</Text>
          <Input
            label="Amount (grams)"
            keyboardType="decimal-pad"
            value={amountInput}
            onChangeText={setAmountInput}
            hint={`Default serving: ${addingFood.default_serving_g}g`}
          />
          <View style={styles.amountBtns}>
            <Button title="Cancel" variant="ghost" size="sm" onPress={() => setAddingFood(null)} />
            <Button title="Add" size="sm" onPress={addItem} />
          </View>
        </Card>
      )}

      {/* Pending items */}
      {pendingItems.length > 0 && (
        <View style={styles.pending}>
          <View style={styles.pendingHeader}>
            <Text variant="label">Items ({pendingItems.length})</Text>
            <Text variant="bodySmall" color={colors.primary} style={{ fontWeight: '700' }}>
              ~{Math.round(getTotalPrimary())} {primaryUnit} {primaryLabel.toLowerCase()}
            </Text>
          </View>
          {pendingItems.map((item, i) => {
            const computed = calculateItemNutrients(
              { id: item.food.id, name: item.food.name, default_serving_g: item.food.default_serving_g, food_nutrients: item.food.food_nutrients.map(fn => ({ nutrient_key: fn.nutrient_key, amount_per_100g: fn.amount_per_100g })) },
              item.amount_grams,
            );
            const primaryAmount = computed[primaryResultKey];
            return (
              <View key={i} style={styles.pendingItem}>
                <Text variant="body" style={{ flex: 1 }}>{item.food.name}</Text>
                <Text variant="bodySmall" color={colors.textSecondary}>{item.amount_grams}g</Text>
                {primaryAmount != null && (
                  <Text variant="bodySmall" color={colors.primary} style={{ fontWeight: '600' }}>
                    {Math.round(primaryAmount)} {primaryUnit}
                  </Text>
                )}
                <TouchableOpacity onPress={() => removeItem(i)}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            );
          })}
          <TouchableOpacity onPress={() => setPendingItems([])} style={styles.clearAll}>
            <Text variant="caption" color={colors.textMuted}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      <Button
        title="Save meal"
        onPress={handleSubmit(onSubmit)}
        loading={logMeal.isPending}
        disabled={!pendingItems.length}
        style={styles.saveBtn}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: spacing.md },
  label: { marginBottom: spacing.xs, marginTop: spacing.md },
  mealTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  mealTypeBtn: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  mealTypeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  repeatToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, marginBottom: spacing.xs },
  repeatCard: { marginBottom: spacing.sm },
  repeatItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm },
  searchInput: { marginBottom: spacing.sm },
  searchResults: { marginBottom: spacing.sm },
  searchItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm },
  noResults: { padding: spacing.sm },
  addCustom: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  newFoodCard: { marginVertical: spacing.sm, gap: spacing.sm },
  newFoodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  newFoodBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  amountCard: { marginVertical: spacing.sm, gap: spacing.sm },
  amountBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  pending: { marginTop: spacing.md, gap: spacing.xs },
  pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  pendingItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  clearAll: { alignSelf: 'flex-end', paddingTop: spacing.xs },
  saveBtn: { marginTop: spacing.xl },
});
