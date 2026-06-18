import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Text, Button, colors, spacing } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useChildren } from '../../../src/features/children/useChildren';
import { useTrackerEvents, useLogTrackerEvent } from '../../../src/features/trackers/useTrackerEvents';
import type { TrackerEvent } from '../../../src/lib/database.types';
import { Ionicons } from '@expo/vector-icons';

type TrackerType = 'diaper' | 'medicine' | 'activity';

interface TrackerDefinition {
  type: TrackerType;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  quickLog?: Record<string, unknown>;
}

const TRACKERS: TrackerDefinition[] = [
  { type: 'diaper', label: 'Diaper', icon: 'water-outline', color: colors.accent, quickLog: { wet: true } },
  { type: 'medicine', label: 'Medicine', icon: 'medical-outline', color: colors.danger },
  { type: 'activity', label: 'Activity', icon: 'walk-outline', color: colors.success },
];

export default function TrackersScreen() {
  const { primaryCircle, user } = useAuth();
  const router = useRouter();
  const { data: children } = useChildren(primaryCircle?.id);
  const activeChildId = children?.[0]?.id;
  const logEvent = useLogTrackerEvent();
  const { data: recentEvents } = useTrackerEvents(activeChildId, undefined, 10);

  async function quickLog(tracker: TrackerDefinition) {
    if (!activeChildId || !user) return;
    await logEvent.mutateAsync({
      child_id: activeChildId,
      type: tracker.type,
      logged_by: user.id,
      data: tracker.quickLog ?? {},
    });
    Alert.alert(`${tracker.label} logged!`);
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text variant="h2">Trackers</Text>
        <Button
          title="Medications"
          size="sm"
          variant="secondary"
          onPress={() => router.push('/(app)/trackers/medications')}
        />
      </View>
      <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
        Quick-log diapers and activities. Manage medications for dose logging.
      </Text>

      {/* Quick-log buttons */}
      <View style={styles.grid}>
        {TRACKERS.map((tracker) => (
          <TouchableOpacity
            key={tracker.type}
            style={[styles.trackerBtn, { borderColor: tracker.color }]}
            onPress={() => quickLog(tracker)}
            disabled={!activeChildId || logEvent.isPending}
          >
            <Ionicons name={tracker.icon} size={32} color={tracker.color} />
            <Text variant="label" color={tracker.color}>{tracker.label}</Text>
            <Text variant="caption" color={colors.textMuted}>Tap to log</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent events */}
      <Text variant="h3" style={styles.recentHeading}>Recent</Text>
      {recentEvents?.length ? (
        recentEvents.map((event: TrackerEvent) => {
          const tracker = TRACKERS.find((t) => t.type === event.type);
          return (
            <Card key={event.id} style={styles.eventCard}>
              <Ionicons
                name={tracker?.icon ?? 'ellipse-outline'}
                size={20}
                color={tracker?.color ?? colors.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ textTransform: 'capitalize' }}>{event.type}</Text>
                <Text variant="caption" color={colors.textMuted}>
                  {new Date(event.occurred_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </Card>
          );
        })
      ) : (
        <Card style={styles.empty}>
          <Text variant="body" color={colors.textMuted} style={{ textAlign: 'center' }}>
            No events logged yet
          </Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  heading: { marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.lg },
  grid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  trackerBtn: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  recentHeading: { marginBottom: spacing.sm },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  empty: { alignItems: 'center', padding: spacing.xl },
});
