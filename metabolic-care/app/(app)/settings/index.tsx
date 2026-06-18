import React, { useState } from 'react';
import { View, StyleSheet, Alert, Switch } from 'react-native';
import { Screen, Card, Text, Button, Input, colors, spacing } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useCircleMembers, useInviteMember } from '../../../src/features/auth/useCircleMembers';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import type { MemberPermissions } from '../../../src/lib/database.types';

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email'),
});
type InviteForm = z.infer<typeof inviteSchema>;

const DEFAULT_SECONDARY_PERMISSIONS: MemberPermissions = {
  can_log: true,
  can_view_analytics: true,
  can_edit_targets: false,
  can_manage_members: false,
  can_edit_foods: false,
};

export default function SettingsScreen() {
  const { primaryCircle, profile, signOut } = useAuth();
  const { data: members } = useCircleMembers(primaryCircle?.id);
  const inviteMember = useInviteMember();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [permissions, setPermissions] = useState<MemberPermissions>(DEFAULT_SECONDARY_PERMISSIONS);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  });

  async function sendInvite({ email }: InviteForm) {
    if (!primaryCircle || !profile) return;
    const invite = await inviteMember.mutateAsync({
      care_circle_id: primaryCircle.id,
      email,
      role: 'secondary',
      permissions,
      created_by: profile.id,
    });
    Alert.alert(
      'Invite created',
      `Share this token with ${email}: ${invite.token}\n\nFull invite flow (email delivery) to be added in a future update.`,
    );
    reset();
    setShowInviteForm(false);
  }

  function togglePermission(key: keyof MemberPermissions) {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <Screen>
      <Text variant="h2" style={styles.heading}>Settings</Text>

      {/* Profile */}
      <Card style={styles.section}>
        <Text variant="label" color={colors.textSecondary}>Account</Text>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text variant="h3" color={colors.primary}>
              {profile?.display_name?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <View>
            <Text variant="body" style={{ fontWeight: '600' }}>{profile?.display_name}</Text>
            <Text variant="bodySmall" color={colors.textSecondary}>Primary caretaker</Text>
          </View>
        </View>
        <Button title="Sign out" variant="danger" size="sm" onPress={signOut} style={styles.signOutBtn} />
      </Card>

      {/* Care circle */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="label" color={colors.textSecondary}>
            Care circle — {primaryCircle?.name}
          </Text>
          <Button
            title="Invite"
            size="sm"
            variant="secondary"
            onPress={() => setShowInviteForm(!showInviteForm)}
          />
        </View>

        {/* Members list */}
        {members?.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <View style={styles.memberAvatar}>
              <Text variant="bodySmall" color={colors.primary}>
                {member.profile?.display_name?.charAt(0).toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body">{member.profile?.display_name}</Text>
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'capitalize' }}>
                {member.role}
              </Text>
            </View>
            {member.role === 'primary' && (
              <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
            )}
          </View>
        ))}

        {/* Invite form */}
        {showInviteForm && (
          <View style={styles.inviteForm}>
            <Text variant="h3">Invite secondary caretaker</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input
                  label="Their email address"
                  placeholder="caregiver@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                />
              )}
            />

            <Text variant="label" color={colors.textSecondary}>Permissions</Text>
            {(Object.keys(DEFAULT_SECONDARY_PERMISSIONS) as (keyof MemberPermissions)[]).map((key) => (
              <View key={key} style={styles.permRow}>
                <Text variant="body" style={{ flex: 1, textTransform: 'capitalize' }}>
                  {key.replace('can_', '').replace(/_/g, ' ')}
                </Text>
                <Switch
                  value={permissions[key]}
                  onValueChange={() => togglePermission(key)}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={permissions[key] ? colors.primary : colors.textMuted}
                />
              </View>
            ))}

            <Button
              title="Send invite"
              onPress={handleSubmit(sendInvite)}
              loading={inviteMember.isPending}
            />
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: spacing.md },
  section: { marginBottom: spacing.md, gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  signOutBtn: { alignSelf: 'flex-start' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  memberAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  inviteForm: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, gap: spacing.md },
  permRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
});
