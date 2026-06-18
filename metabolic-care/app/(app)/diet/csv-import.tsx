import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Screen, Card, Text, Button, colors, spacing } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useCsvImport } from '../../../src/features/diet/useCsvImport';
import { Ionicons } from '@expo/vector-icons';

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text variant="label" color={colors.primary}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="label" style={styles.stepTitle}>{title}</Text>
        {children}
      </View>
    </View>
  );
}

export default function CsvImportScreen() {
  const { primaryCircle, user } = useAuth();
  const { importState, importing, imported, pickAndParse, commitImport, reset } =
    useCsvImport(primaryCircle?.id ?? '', user?.id ?? '');

  if (!primaryCircle || !user) return null;

  return (
    <Screen>
      <Text variant="h2" style={styles.heading}>Import CSV</Text>
      <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
        Load your dietitian's food and lysine data from a CSV file.
      </Text>

      {/* Success state */}
      {imported != null && (
        <Card style={styles.successCard}>
          <Ionicons name="checkmark-circle" size={32} color={colors.success} />
          <Text variant="h3" color={colors.success}>{imported} foods imported</Text>
          <Text variant="bodySmall" color={colors.textSecondary}>
            These foods are now available when logging meals.
          </Text>
          <Button title="Import another file" variant="secondary" size="sm" onPress={reset} />
        </Card>
      )}

      {/* Steps guide — hide after import */}
      {imported == null && (
        <Card style={styles.stepsCard}>
          <Step n={1} title="Get your CSV from your dietitian">
            <Text variant="bodySmall" color={colors.textSecondary}>
              Ask your dietitian for a food list spreadsheet and export/save it as .csv.
            </Text>
            <Text variant="bodySmall" color={colors.textMuted} style={styles.tip}>
              A sample file is included in the app: data/foods.sample.csv
            </Text>
          </Step>

          <View style={styles.divider} />

          <Step n={2} title="Required CSV format">
            <Text variant="caption" color={colors.textMuted} style={styles.code}>
              name,lysine_mg_per_100g
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
              Optional columns:
            </Text>
            <Text variant="caption" color={colors.textMuted} style={styles.code}>
              brand,protein_g_per_100g,energy_kcal_per_100g,default_serving_g
            </Text>
            <Text variant="bodySmall" color={colors.textMuted} style={styles.tip}>
              Only <Text variant="bodySmall" style={{ fontWeight: '700' }}>name</Text> and{' '}
              <Text variant="bodySmall" style={{ fontWeight: '700' }}>lysine_mg_per_100g</Text> are required.
              Other columns can be blank or omitted.
            </Text>
          </Step>

          <View style={styles.divider} />

          <Step n={3} title="Choose your file">
            {!importState ? (
              <Button
                title="Choose CSV file"
                onPress={pickAndParse}
                style={{ marginTop: spacing.sm }}
              />
            ) : (
              <Text variant="bodySmall" color={colors.success}>
                File chosen: {importState.fileName}
              </Text>
            )}
          </Step>

          {importState && (
            <>
              <View style={styles.divider} />
              <Step n={4} title="Review and confirm">
                <View style={styles.counts}>
                  <Text variant="bodySmall" color={colors.success}>
                    {importState.validCount} valid
                  </Text>
                  {importState.errorCount > 0 && (
                    <Text variant="bodySmall" color={colors.danger}>
                      {' '}· {importState.errorCount} errors (shown in red below)
                    </Text>
                  )}
                </View>
              </Step>
            </>
          )}
        </Card>
      )}

      {/* Preview table */}
      {importState && imported == null && (
        <View style={styles.preview}>
          <Text variant="h3">{importState.fileName}</Text>

          <ScrollView horizontal style={styles.table}>
            <View>
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

      {/* Bulk import note */}
      {imported == null && !importState && (
        <Card style={styles.tipCard}>
          <Ionicons name="terminal-outline" size={18} color={colors.textMuted} />
          <Text variant="bodySmall" color={colors.textMuted}>
            For large dietitian databases (thousands of foods), use the{' '}
            <Text variant="bodySmall" style={{ fontWeight: '700' }}>npm run import-foods</Text>{' '}
            script instead — see README for details.
          </Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.md },
  successCard: { alignItems: 'center', gap: spacing.md, padding: spacing.xl, marginBottom: spacing.md },
  stepsCard: { gap: spacing.md, marginBottom: spacing.md },
  step: { flexDirection: 'row', gap: spacing.sm },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepTitle: { marginBottom: spacing.xs },
  divider: { height: 1, backgroundColor: colors.border },
  code: {
    fontFamily: 'monospace',
    fontSize: 11,
    backgroundColor: colors.border,
    padding: spacing.xs,
    borderRadius: 4,
    marginTop: spacing.xs,
  },
  tip: { marginTop: spacing.xs, fontStyle: 'italic' },
  counts: { flexDirection: 'row', marginTop: spacing.xs },
  preview: { gap: spacing.md },
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
  },
  tableHeader: { backgroundColor: colors.surfaceAlt },
  tableRowError: { backgroundColor: colors.dangerLight },
  col: { width: 140, paddingRight: spacing.sm },
  colWide: { width: 120 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.surfaceAlt },
});
