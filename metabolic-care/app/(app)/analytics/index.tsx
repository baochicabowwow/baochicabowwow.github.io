import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions, TouchableOpacity, ScrollView } from 'react-native';
import { Screen, Card, Text, colors, spacing } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useChildren } from '../../../src/features/children/useChildren';
import { useDailyIntake } from '../../../src/features/analytics/useDailyIntake';
import { TrendChart } from '../../../src/components/TrendChart';

const RANGES = [7, 14, 30] as const;
type Range = typeof RANGES[number];

export default function AnalyticsScreen() {
  const { primaryCircle } = useAuth();
  const { data: children } = useChildren(primaryCircle?.id);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [range, setRange] = useState<Range>(14);
  const { width } = useWindowDimensions();

  const activeChildId = selectedChildId ?? children?.[0]?.id;
  const { data: intakeData, isLoading } = useDailyIntake(activeChildId, 'lysine', range);

  const activeChild = children?.find((c) => c.id === activeChildId);
  const chartWidth = width - spacing.md * 2 - 32; // account for card padding

  // Summary stats
  const days = intakeData ?? [];
  const avg = days.length ? days.reduce((s, d) => s + d.total_amount, 0) / days.length : 0;
  const daysOver = days.filter((d) => d.within_limit === false).length;
  const daysUnder = days.filter((d) => d.within_limit === true).length;
  const effectiveLimit = days[0]?.effective_limit;

  return (
    <Screen>
      <Text variant="h2" style={styles.heading}>Analytics</Text>

      {/* Child selector */}
      {(children?.length ?? 0) > 1 && (
        <View style={styles.childSelector}>
          {children!.map((child) => (
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
          <Text variant="h3">Lysine intake — last {range} days</Text>
          {effectiveLimit && (
            <Text variant="caption" color={colors.textMuted}>
              — — Target: {Math.round(effectiveLimit)} mg
            </Text>
          )}
        </View>
        {days.length > 0 ? (
          <TrendChart data={days} unit="mg" width={chartWidth} />
        ) : (
          <View style={styles.noData}>
            <Text variant="body" color={colors.textMuted} style={{ textAlign: 'center' }}>
              {isLoading ? 'Loading...' : 'No data yet — start logging meals to see trends'}
            </Text>
          </View>
        )}
      </Card>

      {/* Summary cards */}
      {days.length > 0 && (
        <View style={styles.stats}>
          <Card style={styles.statCard}>
            <Text variant="label" color={colors.textSecondary}>Daily avg</Text>
            <Text variant="h2" color={colors.primary}>{Math.round(avg)}</Text>
            <Text variant="caption" color={colors.textMuted}>mg lysine</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text variant="label" color={colors.danger}>Days over</Text>
            <Text variant="h2" color={colors.danger}>{daysOver}</Text>
            <Text variant="caption" color={colors.textMuted}>of {days.length}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text variant="label" color={colors.success}>Days under</Text>
            <Text variant="h2" color={colors.success}>{daysUnder}</Text>
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
