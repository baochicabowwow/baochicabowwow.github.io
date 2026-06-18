import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, ProgressBar, colors, spacing } from './ui';
import { remainingAllowance, percentOfLimit } from '../domain/nutrition/calculations';
import { getNutrientDisplayName } from '../lib/diseaseProfiles';

interface Props {
  nutrientLabel: string;
  unit: string;
  consumed: number;
  limit: number | null | undefined;
  limitType?: 'upper' | 'lower';
}

export function DailyNutrientSummary({
  nutrientLabel,
  unit,
  consumed,
  limit,
  limitType = 'upper',
}: Props) {
  const hasLimit = limit != null && limit > 0;
  const percent = hasLimit ? percentOfLimit(consumed, limit!) : 0;
  const isUpper = limitType === 'upper';

  // Upper limit: over is bad. Lower limit: under is concerning.
  const isBreached = hasLimit && (isUpper ? consumed > limit! : consumed < limit!);
  const displayName = getNutrientDisplayName(nutrientLabel);

  function getStatusColor() {
    if (!hasLimit) return colors.primary;
    if (isBreached) return colors.danger;
    if (isUpper) {
      // approaching the upper limit
      if (percent >= 85) return colors.warning;
      return colors.primary;
    }
    // lower goal: green when at/above, warning when far below
    if (percent >= 100) return colors.success;
    if (percent < 50) return colors.warning;
    return colors.primary;
  }

  const statusColor = getStatusColor();

  return (
    <Card style={styles.card}>
      <Text variant="label" color={colors.textSecondary}>
        {displayName} today
        {isUpper ? (
          <Text variant="label" color={colors.textMuted}> · upper limit</Text>
        ) : (
          <Text variant="label" color={colors.textMuted}> · daily goal</Text>
        )}
      </Text>

      <View style={styles.row}>
        <Text variant="h2" color={statusColor}>
          {Math.round(consumed)}
        </Text>
        <Text variant="body" color={colors.textSecondary} style={styles.unit}>
          {' '}{unit}
        </Text>
        {hasLimit && (
          <Text variant="body" color={colors.textMuted} style={styles.limit}>
            {' '}/ {Math.round(limit!)} {unit}
          </Text>
        )}
      </View>

      {hasLimit && (
        <>
          <ProgressBar percent={isUpper ? percent : Math.min(percent, 100)} style={styles.bar} />
          <View style={styles.footer}>
            {isUpper ? (
              isBreached ? (
                <Text variant="bodySmall" color={colors.danger} style={styles.bold}>
                  {Math.round(consumed - limit!)} {unit} over daily limit — restriction exceeded
                </Text>
              ) : (
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {Math.round(remainingAllowance(consumed, limit!))} {unit} remaining under limit ({Math.round(percent)}% used)
                </Text>
              )
            ) : (
              isBreached ? (
                <Text variant="bodySmall" color={colors.warning}>
                  {Math.round(limit! - consumed)} {unit} still needed to reach daily goal
                </Text>
              ) : (
                <Text variant="bodySmall" color={colors.success}>
                  {Math.round(consumed - limit!)} {unit} above daily goal
                </Text>
              )
            )}
          </View>
        </>
      )}

      {!hasLimit && (
        <Text variant="bodySmall" color={colors.textMuted} style={styles.noLimit}>
          No limit set — go to Children to set a target
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'baseline' },
  unit: { lineHeight: 26 },
  limit: { lineHeight: 26 },
  bar: { marginTop: 4 },
  footer: { marginTop: 2 },
  noLimit: { marginTop: 2 },
  bold: { fontWeight: '700' },
});
