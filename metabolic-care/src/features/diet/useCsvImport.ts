import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import { z } from 'zod';
import { Platform } from 'react-native';
import { useCreateFood } from './useFoods';

const CsvRowSchema = z.object({
  name: z.string().min(1, 'name is required'),
  brand: z.string().optional(),
  lysine_mg_per_100g: z.coerce.number().nonnegative(),
  protein_g_per_100g: z.coerce.number().nonnegative().optional(),
  energy_kcal_per_100g: z.coerce.number().nonnegative().optional(),
  default_serving_g: z.coerce.number().positive().optional(),
});

export type CsvRow = z.infer<typeof CsvRowSchema>;

export interface CsvImportRow {
  row: CsvRow;
  error?: string;
}

export interface CsvImportState {
  rows: CsvImportRow[];
  fileName: string | null;
  validCount: number;
  errorCount: number;
}

export function useCsvImport(careCircleId: string, userId: string) {
  const [importState, setImportState] = useState<CsvImportState | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<number | null>(null);
  const createFood = useCreateFood();

  async function pickAndParse() {
    setImported(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: Platform.OS === 'web' ? 'text/csv' : '*/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    let text: string;

    if (Platform.OS === 'web') {
      const response = await fetch(asset.uri);
      text = await response.text();
    } else {
      text = await FileSystem.readAsStringAsync(asset.uri);
    }

    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });

    const rows: CsvImportRow[] = parsed.data.map((raw) => {
      const result = CsvRowSchema.safeParse(raw);
      if (result.success) {
        return { row: result.data };
      }
      return {
        row: raw as unknown as CsvRow,
        error: result.error.errors[0]?.message ?? 'Invalid row',
      };
    });

    const validCount = rows.filter((r) => !r.error).length;
    const errorCount = rows.filter((r) => !!r.error).length;

    setImportState({
      rows,
      fileName: asset.name,
      validCount,
      errorCount,
    });
  }

  async function commitImport() {
    if (!importState) return;
    setImporting(true);

    const validRows = importState.rows.filter((r) => !r.error);
    let count = 0;

    for (const { row } of validRows) {
      try {
        const nutrients: { nutrient_key: string; amount_per_100g: number }[] = [
          { nutrient_key: 'lysine', amount_per_100g: row.lysine_mg_per_100g },
        ];
        if (row.protein_g_per_100g != null)
          nutrients.push({ nutrient_key: 'protein', amount_per_100g: row.protein_g_per_100g });
        if (row.energy_kcal_per_100g != null)
          nutrients.push({ nutrient_key: 'energy', amount_per_100g: row.energy_kcal_per_100g });

        await createFood.mutateAsync({
          care_circle_id: careCircleId,
          name: row.name,
          brand: row.brand ?? null,
          source: 'csv',
          default_serving_g: row.default_serving_g ?? 100,
          created_by: userId,
          nutrients,
        });
        count++;
      } catch {
        // continue with other rows
      }
    }

    setImported(count);
    setImportState(null);
    setImporting(false);
  }

  function reset() {
    setImportState(null);
    setImported(null);
  }

  return { importState, importing, imported, pickAndParse, commitImport, reset };
}
