import React, { useState, useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions, TouchableOpacity, ScrollView } from 'react-native';
import { Screen, Card, Text, colors, spacing } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useChildren } from '../../../src/features/children/useChildren';
import { useNutrientTargets } from '../../../src/features/children/useNutrientTargets';
import { useDailyIntake } from '../../../src/features/analytics/useDailyIntake';
import { TrendChart } from '../../../src/components/TrendChart';
import { getNutrientDisplayName, getNutrientUnit } from '../../../src/lib/diseaseProfiles';
import type { Child, ChildNutrientTarget, DailyNutrientIntake } from '../../../src/lib/database.types';

const RANGES = [7, 14, 30] as const;
type Range = typeof RANGES[number];

export default function AnalyticsScreen() {
  const { primaryCircle } = useAuth();
  const { data: children } = useChildren(primaryCircle?.id);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [range, setRange] = useState<Range>(14);
  const [nutrientKey, setNutrientKey] = useState<string>('lysine');
  const { width } = useWindowDimensions();

  const activeChildId = selectedChildId ?? children?.[0]?.id;
  const { data: targets } = useNutrientTargets(activeChildId);
  const { data: intakeData, isLoading } = useDailyIntake(activeChildId, nutrientKey, range);

  // When targets load, default to first target's nutrient
  useEffect(() => {
    if (targets && targets.length > 0) {
      const keys = targets.map((t: ChildNutrientTarget) => t.nutrient_key);
      if (!keys.includes(nutrientKey)) {
        setNutrientKey(keys[0]);
      }
    }
  }, [targets]);

  const chartWidth = width - spacing.md * 2 - 32;

  const days = intakeData ?? [];
  const avg = days.length ? days.reduce((s: number, d: DailyNutrientIntake) => s + d.total_amount, 0) / days.length : 0;
  const effectiveLimit = days[0]?.effective_limit;
  const limitType = days[0]?.limit_type ?? targets?.find((t: ChildNutrientTarget) => t.nutrient_key === nutrientKey)?.limit_type ?? 'upper';

  const daysBreached = days.filter((d: DailyNutrientIntake) => d.within_limit === false).length;
  const daysCompliant = days.filter((d: DailyNutrientIntake) => d.within_limit === true).length;

  const nutrientLabel = getNutrientDisplayName(nutrientKey);
  const nutrientUnit = getNutrientUnit(nutrientKey);

  return (
    <Screen>
      <Text variant="h2" style={styles.heading}>Analytics</Text>

      {/* Child selector */}
      {(children?.length ?? 0) > 1 && (
        <View style={styles.childSelector}>
          {children!.map((child: Child) => (
            <TouchableOpacity
              key={child.id}
              onPress={() => setSelectedChildId(child.id)}
              style={[styles.childTab, child.id === activeChildId && styles.childTabActive]}
            >
              <Text
                variant="bodySmall"
                color={child.id === activeChildId ? colors.primary : colors.textSecondary}
                style={{ fontWeight: child.id === activeChildId ? '700' : '400' }}
              >
                {child.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Nutrient picker — shown when child has more than one tracked nutrient */}
      {targets && targets.length > 1 && (
        <View style={styles.nutrientSelector}>
          <Text variant="label" color={colors.textSecondary} style={styles.nutrientLabel}>Nutrient</Text>
          <View style={styles.pills}>
            {targets.map((t: ChildNutrientTarget) => (
              <TouchableOpacity
                key={t.nutrient_key}
                onPress={() => setNutrientKey(t.nutrient_key)}
                style={[styles.pill, t.nutrient_key === nutrientKey && styles.pillActive]}
              >
                <Text
                  variant="bodySmall"
                  color={t.nutrient_key === nutrientKey ? colors.primary : colors.textSecondary}
                  style={{ fontWeight: t.nutrient_key === nutrientKey ? '700' : '400' }}
                >
                  {getNutrientDisplayName(t.nutrient_key)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Range selector */}
      <View style={styles.rangeSelector}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => setRange(r)}
            style={[styles.rangeBtn, r === range && styles.rangeBtnActive]}
          >
            <Text
              variant="bodySmall"
              color={r === range ? colors.primary : colors.textSecondary}
              style={{ fontWeight: r === range ? '700' : '400' }}
            >
              {r}d
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text variant="h3">
            {nutrientLabel} — last {range} days
          </Text>
          <Text variant="caption" color={colors.textMuted}>
            {limitType === 'upper' ? 'Upper limit (restriction)' : 'Daily goal (minimum)'}
          </Text>
          {effectiveLimit && (
            <Text variant="caption" color={colors.textMuted}>
              — — Limit: {Math.round(effectiveLimit)} {nutrientUnit}
            </Text>
          )}
        </View>
        {days.length > 0 ? (
          <TrendChart data={days} unit={nutrientUnit} width={chartWidth} />
        ) : (
          <View style={styles.noData}>
            <Text variant="body" color={colors.textMuted} style={{ textAlign: 'center' }}>
              {isLoading ? 'Loading...' : 'No data yet — start logging meals to see trends'}
            </Text>
          </View>
        )}
      </Card>

      {/* Summary stats */}
      {days.length > 0 && (
        <View style={styles.stats}>
          <Card style={styles.statCard}>
            <Text variant="label" color={colors.textSecondary}>Daily avg</Text>
            <Text variant="h2" color={colors.primary}>{Math.round(avg)}</Text>
            <Text variant="caption" color={colors.textMuted}>{nutrientUnit} {nutrientLabel.toLowerCase()}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text variant="label" color={colors.danger}>
              {limitType === 'upper' ? 'Days over limit' : 'Days under goal'}
            </Text>
            <Text variant="h2" color={colors.danger}>{daysBreached}</Text>
            <Text variant="caption" color={colors.textMuted}>of {days.length}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text variant="label" color={colors.success}>
              {limitType === 'upper' ? 'Days within limit' : 'Days at goal'}
            </Text>
            <Text variant="h2" color={colors.success}>{daysCompliant}</Text>
            <Text variant="caption" color={colors.textMuted}>of {days.length}</Text>
          </Card>
        </View>
      )}

      {!activeChildId && (
        <Card style={styles.empty}>
          <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
            Add a child to see analytics
          </Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: spacing.md },
  childSelector: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm },
  childTab: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  childTabActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  nutrientSelector: { marginBottom: spacing.sm },
  nutrientLabel: { marginBottom: spacing.xs },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  pillActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  rangeSelector: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  rangeBtn: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  rangeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chartCard: { marginBottom: spacing.md, gap: spacing.sm },
  chartHeader: { gap: 2 },
  noData: { height: 160, justifyContent: 'center', alignItems: 'center' },
  stats: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, alignItems: 'center', gap: 2 },
  empty: { alignItems: 'center', padding: spacing.xl },
});
