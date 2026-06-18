import React, { useState } from 'react';
import { View, StyleSheet, SectionList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Text, Button, colors, spacing } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useChildren } from '../../../src/features/children/useChildren';
import { useTimeline, type DayGroup, type TimelineEntry } from '../../../src/features/timeline/useTimeline';

type TimelineSection = { title: string; group: DayGroup; data: TimelineEntry[] };
import { Ionicons } from '@expo/vector-icons';
import type { Child } from '../../../src/lib/database.types';

const RANGES = [7, 14, 30] as const;
type Range = typeof RANGES[number];

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const EVENT_ICONS: Record<string, { icon: IoniconName; color: string }> = {
  meal: { icon: 'restaurant-outline', color: colors.primary },
  medicine: { icon: 'medical-outline', color: colors.danger },
  diaper: { icon: 'water-outline', color: colors.accent },
  activity: { icon: 'walk-outline', color: colors.success },
  tracker: { icon: 'ellipse-outline', color: colors.textMuted },
};

function TimelineItem({ entry }: { entry: TimelineEntry }) {
  const { icon, color } = EVENT_ICONS[entry.type] ?? EVENT_ICONS.tracker;
  const time = new Date(entry.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={styles.entry}>
      <View style={[styles.entryIcon, { borderColor: color }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={styles.entryContent}>
        <Text variant="body" style={{ fontWeight: '600' }}>{entry.label}</Text>
        {entry.detail ? (
          <Text variant="bodySmall" color={colors.textSecondary}>{entry.detail}</Text>
        ) : null}
      </View>
      <Text variant="caption" color={colors.textMuted}>{time}</Text>
    </View>
  );
}

function DaySummary({ group }: { group: DayGroup }) {
  const chips = [
    group.mealCount > 0 && `${group.mealCount} meal${group.mealCount !== 1 ? 's' : ''}`,
    group.medicineCount > 0 && `${group.medicineCount} dose${group.medicineCount !== 1 ? 's' : ''}`,
    group.diaperCount > 0 && `${group.diaperCount} diaper${group.diaperCount !== 1 ? 's' : ''}`,
  ].filter(Boolean) as string[];

  return (
    <View style={styles.daySummary}>
      {chips.map((chip) => (
        <View key={chip} style={styles.chip}>
          <Text variant="caption" color={colors.textSecondary}>{chip}</Text>
        </View>
      ))}
    </View>
  );
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dateStr === today.toISOString().slice(0, 10)) return 'Today';
  if (dateStr === yesterday.toISOString().slice(0, 10)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function TimelineScreen() {
  const { primaryCircle } = useAuth();
  const router = useRouter();
  const { data: children } = useChildren(primaryCircle?.id);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [range, setRange] = useState<Range>(7);

  const activeChildId = selectedChildId ?? children?.[0]?.id;
  const { data: days, isLoading } = useTimeline(activeChildId, range);

  const sections: TimelineSection[] = (days ?? []).map((group: DayGroup) => ({
    title: group.date,
    group,
    data: group.entries,
  }));

  return (
    <Screen scroll={false}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="h2">Timeline</Text>

            {/* Child selector */}
            {(children?.length ?? 0) > 1 && (
              <View style={styles.childSelector}>
                {children!.map((child: Child) => (
                  <TouchableOpacity
                    key={child.id}
                    onPress={() => setSelectedChildId(child.id)}
                    style={[styles.tab, child.id === activeChildId && styles.tabActive]}
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

            {/* Quick actions */}
            <View style={styles.actions}>
              <Button title="+ Log meal" size="sm" onPress={() => router.push('/(app)/diet/log')} />
              <Button title="+ Medications" size="sm" variant="secondary" onPress={() => router.push('/(app)/trackers/medications')} />
            </View>
          </View>
        }
        renderSectionHeader={({ section }: { section: TimelineSection }) => (
          <View style={styles.dayHeader}>
            <Text variant="label" style={{ fontWeight: '700' }}>
              {formatDateHeader(section.title)}
            </Text>
            <DaySummary group={section.group} />
          </View>
        )}
        renderItem={({ item }) => <TimelineItem entry={item} />}
        ListEmptyComponent={
          !isLoading ? (
            <Card style={styles.empty}>
              <Text variant="body" color={colors.textMuted} style={{ textAlign: 'center' }}>
                No events in the last {range} days.
              </Text>
              <Button
                title="Log first meal"
                size="sm"
                variant="secondary"
                style={{ marginTop: spacing.sm }}
                onPress={() => router.push('/(app)/diet/log')}
              />
            </Card>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xl },
  header: { gap: spacing.sm, padding: spacing.md, paddingBottom: 0 },
  childSelector: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  tab: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  tabActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  rangeSelector: { flexDirection: 'row', gap: spacing.xs },
  rangeBtn: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  rangeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  actions: { flexDirection: 'row', gap: spacing.sm },
  dayHeader: { backgroundColor: colors.background, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  daySummary: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 4 },
  chip: { backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 12 },
  entry: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
  entryIcon: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  entryContent: { flex: 1, gap: 2 },
  empty: { margin: spacing.md, alignItems: 'center', padding: spacing.xl },
});
