import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Food, FoodNutrient, FoodServing, Nutrient } from '../../lib/database.types';

export type FoodWithNutrients = Food & {
  food_nutrients: FoodNutrient[];
  food_servings: FoodServing[];
};

export function useNutrients() {
  return useQuery({
    queryKey: ['nutrients'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrients')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as Nutrient[];
    },
  });
}

export function useFoodSearch(query: string, careCircleId: string | undefined) {
  return useQuery({
    queryKey: ['foods', 'search', query, careCircleId],
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('foods')
        .select('*, food_nutrients(*), food_servings(*)')
        .or(
          careCircleId
            ? `care_circle_id.is.null,care_circle_id.eq.${careCircleId}`
            : 'care_circle_id.is.null',
        )
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(30);
      if (error) throw error;
      return data as unknown as FoodWithNutrients[];
    },
  });
}

export function useFood(foodId: string | undefined) {
  return useQuery({
    queryKey: ['food', foodId],
    enabled: !!foodId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('foods')
        .select('*, food_nutrients(*), food_servings(*)')
        .eq('id', foodId!)
        .single();
      if (error) throw error;
      return data as unknown as FoodWithNutrients;
    },
  });
}

interface CreateFoodInput {
  care_circle_id: string;
  name: string;
  brand?: string | null;
  source?: 'custom' | 'csv';
  default_serving_g?: number;
  notes?: string | null;
  created_by: string;
  nutrients: { nutrient_key: string; amount_per_100g: number }[];
  servings?: { label: string; grams: number }[];
}

export function useCreateFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ nutrients, servings, ...foodInput }: CreateFoodInput) => {
      const { data: food, error: foodError } = await supabase
        .from('foods')
        .insert({
          care_circle_id: foodInput.care_circle_id,
          name: foodInput.name,
          brand: foodInput.brand ?? null,
          source: foodInput.source ?? 'custom',
          default_serving_g: foodInput.default_serving_g ?? 100,
          notes: foodInput.notes ?? null,
          created_by: foodInput.created_by,
        })
        .select()
        .single();
      if (foodError) throw foodError;
      if (!food) throw new Error('Food creation failed');

      if (nutrients.length) {
        const { error: nutrientError } = await supabase.from('food_nutrients').insert(
          nutrients.map((n) => ({ food_id: food.id, ...n })),
        );
        if (nutrientError) throw nutrientError;
      }

      if (servings?.length) {
        const { error: servingError } = await supabase.from('food_servings').insert(
          servings.map((s) => ({ food_id: food.id, ...s })),
        );
        if (servingError) throw servingError;
      }

      return food as Food;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['foods'] });
    },
  });
}
