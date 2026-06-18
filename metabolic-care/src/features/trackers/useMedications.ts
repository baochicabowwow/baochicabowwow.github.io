import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Medication } from '../../lib/database.types';

export function useMedications(childId: string | undefined) {
  return useQuery({
    queryKey: ['medications', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('child_id', childId!)
        .order('active', { ascending: false })
        .order('name');
      if (error) throw error;
      return data as Medication[];
    },
  });
}

interface CreateMedicationInput {
  child_id: string;
  name: string;
  dose: string;
  unit: string;
  frequency?: string | null;
  notes?: string | null;
  created_by: string;
}

export function useCreateMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMedicationInput) => {
      const { data, error } = await supabase
        .from('medications')
        .insert({ active: true, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as Medication;
    },
    onSuccess: (med) => {
      qc.invalidateQueries({ queryKey: ['medications', med.child_id] });
    },
  });
}

interface UpdateMedicationInput {
  id: string;
  child_id: string;
  name?: string;
  dose?: string;
  unit?: string;
  frequency?: string | null;
  notes?: string | null;
  active?: boolean;
}

export function useUpdateMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, child_id, ...updates }: UpdateMedicationInput) => {
      const { data, error } = await supabase
        .from('medications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Medication;
    },
    onSuccess: (med) => {
      qc.invalidateQueries({ queryKey: ['medications', med.child_id] });
    },
  });
}

export function useDeleteMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, child_id }: { id: string; child_id: string }) => {
      const { error } = await supabase.from('medications').delete().eq('id', id);
      if (error) throw error;
      return { child_id };
    },
    onSuccess: ({ child_id }) => {
      qc.invalidateQueries({ queryKey: ['medications', child_id] });
    },
  });
}
