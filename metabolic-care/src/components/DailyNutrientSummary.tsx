import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, ProgressBar, colors, spacing } from './ui';
import { remainingAllowance, percentOfLimit } from '../domain/nutrition/calculations';

interface Props {
  nutrientLabel: string;
  unit: string;
  consumed: number;
  limit: number | null | undefined;
}

export function DailyNutrientSummary({ nutrientLabel, unit, consumed, limit }: Props) {
  const hasLimit = limit != null && limit > 0;
  const percent = hasLimit ? percentOfLimit(consumed, limit!) : 0;
  const remaining = hasLimit ? remainingAllowance(consumed, limit!) : null;
  const isOver = hasLimit && consumed > limit!;

  return (
    <Card style={styles.card}>
      <Text variant="label" color={colors.textSecondary}>
        {nutrientLabel} today
      </Text>

      <View style={styles.row}>
        <Text variant="h2" color={isOver ? colors.danger : colors.primary}>
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
          <ProgressBar percent={percent} style={styles.bar} />
          <View style={styles.footer}>
            {isOver ? (
              <Text variant="bodySmall" color={colors.danger}>
                {Math.round(consumed - limit!)} {unit} over daily limit
              </Text>
            ) : (
              <Text variant="bodySmall" color={colors.textSecondary}>
                {Math.round(remaining!)} {unit} remaining ({Math.round(percent)}% used)
              </Text>
            )}
          </View>
        </>
      )}

      {!hasLimit && (
        <Text variant="bodySmall" color={colors.textMuted} style={styles.noLimit}>
          No daily limit set — go to Children to set a target
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
});
