import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Text, Button, colors, spacing } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useChildren } from '../../../src/features/children/useChildren';
import { Ionicons } from '@expo/vector-icons';
import type { Child } from '../../../src/lib/database.types';

export default function ChildrenScreen() {
  const { primaryCircle } = useAuth();
  const router = useRouter();
  const { data: children, isLoading } = useChildren(primaryCircle?.id);

  function ageText(dob: string) {
    const today = new Date();
    const birth = new Date(dob);
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
    if (months < 24) return `${months} month${months !== 1 ? 's' : ''}`;
    const years = Math.floor(months / 12);
    return `${years} year${years !== 1 ? 's' : ''}`;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="h2">Children</Text>
        <Button title="+ Add" size="sm" onPress={() => router.push('/(app)/children/new')} />
      </View>

      <FlatList
        data={children ?? []}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }: { item: Child }) => (
          <TouchableOpacity onPress={() => router.push(`/(app)/children/${item.id}`)}>
            <Card style={styles.childCard}>
              <View style={styles.avatar}>
                <Text variant="h3" color={colors.primary}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="h3">{item.name}</Text>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {ageText(item.date_of_birth)}
                  {item.weight_kg ? ` · ${item.weight_kg} kg` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Card style={styles.empty}>
              <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
                No children added yet.
              </Text>
              <Button
                title="Add first child"
                variant="secondary"
                size="sm"
                style={{ marginTop: spacing.md }}
                onPress={() => router.push('/(app)/children/new')}
              />
            </Card>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  childCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', padding: spacing.xl },
});
