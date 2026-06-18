import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { calculateItemNutrients } from '../../domain/nutrition/calculations';
import type { Meal, MealItem, Json } from '../../lib/database.types';
import type { FoodWithNutrients } from './useFoods';

export type MealWithItems = Meal & {
  meal_items: (MealItem & { food: FoodWithNutrients })[];
};

export function useTodayMeals(childId: string | undefined) {
  const today = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['meals', 'today', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meals')
        .select(`
          *,
          meal_items(
            *,
            food:foods(*, food_nutrients(*), food_servings(*))
          )
        `)
        .eq('child_id', childId!)
        .gte('logged_at', `${today}T00:00:00`)
        .lte('logged_at', `${today}T23:59:59`)
        .order('logged_at', { ascending: false });
      if (error) throw error;
      return data as unknown as MealWithItems[];
    },
  });
}

interface LogMealInput {
  child_id: string;
  logged_by: string;
  meal_type: Meal['meal_type'];
  note?: string | null;
  items: {
    food: FoodWithNutrients;
    amount_grams: number;
  }[];
}

export function useLogMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ items, ...mealInput }: LogMealInput) => {
      const { data: meal, error: mealError } = await supabase
        .from('meals')
        .insert({ ...mealInput, logged_at: new Date().toISOString() })
        .select()
        .single();
      if (mealError) throw mealError;

      if (items.length) {
        const mealItems = items.map((item) => ({
          meal_id: meal.id,
          food_id: item.food.id,
          amount_grams: item.amount_grams,
          // Snapshot nutrients at log time — never mutated retroactively
          computed_nutrients: calculateItemNutrients(
            {
              id: item.food.id,
              name: item.food.name,
              default_serving_g: item.food.default_serving_g,
              food_nutrients: item.food.food_nutrients.map((fn) => ({
                nutrient_key: fn.nutrient_key,
                amount_per_100g: fn.amount_per_100g,
              })),
            },
            item.amount_grams,
          ) as unknown as Json,
        }));

        const { error: itemsError } = await supabase.from('meal_items').insert(mealItems);
        if (itemsError) throw itemsError;
      }

      return meal as Meal;
    },
    onSuccess: (meal) => {
      qc.invalidateQueries({ queryKey: ['meals', 'today', meal.child_id] });
      qc.invalidateQueries({ queryKey: ['daily-intake', meal.child_id] });
    },
  });
}

export function useRecentMeals(childId: string | undefined) {
  return useQuery({
    queryKey: ['meals', 'recent', childId],
    enabled: !!childId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data, error } = await supabase
        .from('meals')
        .select('*, meal_items(*, food:foods(*, food_nutrients(*), food_servings(*)))')
        .eq('child_id', childId!)
        .gte('logged_at', since.toISOString())
        .order('logged_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as unknown as MealWithItems[];
    },
  });
}

export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mealId, childId }: { mealId: string; childId: string }) => {
      const { error } = await supabase.from('meals').delete().eq('id', mealId);
      if (error) throw error;
      return { childId };
    },
    onSuccess: ({ childId }) => {
      qc.invalidateQueries({ queryKey: ['meals', 'today', childId] });
      qc.invalidateQueries({ queryKey: ['daily-intake', childId] });
    },
  });
}
