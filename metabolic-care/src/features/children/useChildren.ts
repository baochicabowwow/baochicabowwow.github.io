import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Child } from '../../lib/database.types';

export function useChildren(careCircleId: string | undefined) {
  return useQuery({
    queryKey: ['children', careCircleId],
    enabled: !!careCircleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('care_circle_id', careCircleId!)
        .order('name');
      if (error) throw error;
      return data as Child[];
    },
  });
}

export function useChild(childId: string | undefined) {
  return useQuery({
    queryKey: ['child', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('id', childId!)
        .single();
      if (error) throw error;
      return data as Child;
    },
  });
}

interface CreateChildInput {
  care_circle_id: string;
  name: string;
  date_of_birth: string;
  weight_kg?: number | null;
  sex?: 'male' | 'female' | 'other' | null;
  conditions?: unknown[];
  notes?: string | null;
}

export function useCreateChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateChildInput) => {
      const { data, error } = await supabase
        .from('children')
        .insert({ ...input, conditions: input.conditions ?? [] })
        .select()
        .single();
      if (error) throw error;
      return data as Child;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['children', vars.care_circle_id] });
    },
  });
}

export function useUpdateChild(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<CreateChildInput>) => {
      const { data, error } = await supabase
        .from('children')
        .update(updates)
        .eq('id', childId)
        .select()
        .single();
      if (error) throw error;
      return data as Child;
    },
    onSuccess: (child) => {
      qc.invalidateQueries({ queryKey: ['child', childId] });
      qc.invalidateQueries({ queryKey: ['children', child.care_circle_id] });
    },
  });
}
