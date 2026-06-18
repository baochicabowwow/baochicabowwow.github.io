import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Screen, Card, Text, Button, colors, spacing } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useCsvImport } from '../../../src/features/diet/useCsvImport';
import { Ionicons } from '@expo/vector-icons';

export default function CsvImportScreen() {
  const { primaryCircle, user } = useAuth();
  const { importState, importing, imported, pickAndParse, commitImport, reset } =
    useCsvImport(primaryCircle?.id ?? '', user?.id ?? '');

  if (!primaryCircle || !user) return null;

  return (
    <Screen>
      <Text variant="h2" style={styles.heading}>Import CSV</Text>
      <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
        Load your dietitian's lysine data directly from a CSV file.
      </Text>

      <Card style={styles.formatCard}>
        <Text variant="label">Expected CSV format</Text>
        <Text variant="caption" color={colors.textMuted} style={styles.code}>
          name,brand,lysine_mg_per_100g,protein_g_per_100g,energy_kcal_per_100g,default_serving_g
        </Text>
        <Text variant="caption" color={colors.textMuted}>
          Only <Text variant="caption" style={{ fontWeight: '700' }}>name</Text> and{' '}
          <Text variant="caption" style={{ fontWeight: '700' }}>lysine_mg_per_100g</Text> are required.
        </Text>
      </Card>

      {imported != null && (
        <Card style={styles.successCard}>
          <Ionicons name="checkmark-circle" size={32} color={colors.success} />
          <Text variant="h3" color={colors.success}>{imported} foods imported</Text>
          <Button title="Import another file" variant="secondary" size="sm" onPress={reset} />
        </Card>
      )}

      {!importState && imported == null && (
        <Button title="Choose CSV file" onPress={pickAndParse} style={styles.pickBtn} />
      )}

      {importState && (
        <View style={styles.preview}>
          <View style={styles.previewHeader}>
            <Text variant="h3">Preview: {importState.fileName}</Text>
            <View style={styles.counts}>
              <Text variant="bodySmall" color={colors.success}>
                {importState.validCount} valid
              </Text>
              {importState.errorCount > 0 && (
                <Text variant="bodySmall" color={colors.danger}>
                  {' '}· {importState.errorCount} errors
                </Text>
              )}
            </View>
          </View>

          <ScrollView horizontal style={styles.table}>
            <View>
              {/* Header row */}
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text variant="label" style={styles.col}>Name</Text>
                <Text variant="label" style={styles.col}>Lysine (mg/100g)</Text>
                <Text variant="label" style={styles.colWide}>Status</Text>
              </View>
              {importState.rows.map((row, i) => (
                <View key={i} style={[styles.tableRow, row.error ? styles.tableRowError : undefined]}>
                  <Text variant="bodySmall" style={styles.col} numberOfLines={1}>
                    {row.row.name ?? '—'}
                  </Text>
                  <Text variant="bodySmall" style={styles.col}>
                    {row.row.lysine_mg_per_100g ?? '—'}
                  </Text>
                  <View style={styles.colWide}>
                    {row.error ? (
                      <Text variant="caption" color={colors.danger}>{row.error}</Text>
                    ) : (
                      <Ionicons name="checkmark" size={14} color={colors.success} />
                    )}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Button title="Cancel" variant="ghost" onPress={reset} />
            <Button
              title={`Import ${importState.validCount} foods`}
              onPress={commitImport}
              loading={importing}
              disabled={importState.validCount === 0}
            />
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.md },
  formatCard: { gap: spacing.xs, marginBottom: spacing.md, backgroundColor: colors.surfaceAlt },
  code: { fontFamily: 'monospace', fontSize: 10, backgroundColor: colors.border, padding: spacing.xs, borderRadius: 4 },
  successCard: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  pickBtn: { marginTop: spacing.md },
  preview: { gap: spacing.md },
  previewHeader: { gap: spacing.xs },
  counts: { flexDirection: 'row' },
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8, paddingHorizontal: spacing.sm },
  tableHeader: { backgroundColor: colors.surfaceAlt },
  tableRowError: { backgroundColor: colors.dangerLight },
  col: { width: 140, paddingRight: spacing.sm },
  colWide: { width: 120 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
