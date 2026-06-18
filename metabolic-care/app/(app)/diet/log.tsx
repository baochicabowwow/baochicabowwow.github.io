import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen, Card, Text, Button, Input, colors, spacing } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useChildren } from '../../../src/features/children/useChildren';
import { useFoodSearch } from '../../../src/features/diet/useFoods';
import { useLogMeal } from '../../../src/features/diet/useMeals';
import { calculateItemNutrients } from '../../../src/domain/nutrition/calculations';
import { Ionicons } from '@expo/vector-icons';
import type { FoodWithNutrients } from '../../../src/features/diet/useFoods';

const schema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'formula', 'supplement']),
  note: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

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
  const [foodQuery, setFoodQuery] = useState('');
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [addingFood, setAddingFood] = useState<FoodWithNutrients | null>(null);
  const [amountInput, setAmountInput] = useState('');

  const { data: searchResults } = useFoodSearch(foodQuery, primaryCircle?.id);
  const logMeal = useLogMeal();

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { mealType: 'snack' },
  });

  function addItem() {
    if (!addingFood) return;
    const grams = parseFloat(amountInput);
    if (!grams || grams <= 0) {
      Alert.alert('Enter a valid amount');
      return;
    }
    setPendingItems((prev) => [...prev, { food: addingFood, amount_grams: grams }]);
    setAddingFood(null);
    setAmountInput('');
    setFoodQuery('');
  }

  function removeItem(index: number) {
    setPendingItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit({ mealType, note }: FormData) {
    if (!pendingItems.length) {
      Alert.alert('Add at least one food item');
      return;
    }
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

  function getTotalLysine() {
    return pendingItems.reduce((sum, item) => {
      const n = calculateItemNutrients(
        { id: item.food.id, name: item.food.name, default_serving_g: item.food.default_serving_g, food_nutrients: item.food.food_nutrients.map(fn => ({ nutrient_key: fn.nutrient_key, amount_per_100g: fn.amount_per_100g })) },
        item.amount_grams,
      );
      return sum + (n.lysine_mg ?? 0);
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
          {searchResults.slice(0, 8).map((food) => (
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
              <Text variant="caption" color={colors.primary}>
                {food.food_nutrients.find(n => n.nutrient_key === 'lysine')?.amount_per_100g ?? '?'} mg/100g
              </Text>
            </TouchableOpacity>
          ))}
        </Card>
      )}

      {/* Amount entry modal */}
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
              ~{Math.round(getTotalLysine())} mg lysine
            </Text>
          </View>
          {pendingItems.map((item, i) => {
            const lysine = calculateItemNutrients(
              { id: item.food.id, name: item.food.name, default_serving_g: item.food.default_serving_g, food_nutrients: item.food.food_nutrients.map(fn => ({ nutrient_key: fn.nutrient_key, amount_per_100g: fn.amount_per_100g })) },
              item.amount_grams,
            ).lysine_mg;
            return (
              <View key={i} style={styles.pendingItem}>
                <Text variant="body" style={{ flex: 1 }}>{item.food.name}</Text>
                <Text variant="bodySmall" color={colors.textSecondary}>{item.amount_grams}g</Text>
                {lysine != null && (
                  <Text variant="bodySmall" color={colors.primary} style={{ fontWeight: '600' }}>
                    {Math.round(lysine)} mg
                  </Text>
                )}
                <TouchableOpacity onPress={() => removeItem(i)}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            );
          })}
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
  mealTypeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealTypeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  searchInput: { marginBottom: spacing.sm },
  searchResults: { marginBottom: spacing.sm },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  amountCard: { marginVertical: spacing.sm, gap: spacing.sm },
  amountBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  pending: { marginTop: spacing.md, gap: spacing.xs },
  pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  pendingItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  saveBtn: { marginTop: spacing.xl },
});
