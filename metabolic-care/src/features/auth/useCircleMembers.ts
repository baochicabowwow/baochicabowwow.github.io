import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { CircleMember, CircleInvite, MemberPermissions } from '../../lib/database.types';

export type CircleMemberWithProfile = CircleMember & {
  profile: { display_name: string; avatar_url: string | null };
};

export function useCircleMembers(careCircleId: string | undefined) {
  return useQuery({
    queryKey: ['circle-members', careCircleId],
    enabled: !!careCircleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('circle_members')
        .select('*, profile:profiles(display_name, avatar_url)')
        .eq('care_circle_id', careCircleId!)
        .eq('status', 'active')
        .order('role');
      if (error) throw error;
      return data as CircleMemberWithProfile[];
    },
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      care_circle_id: string;
      email: string;
      role: 'primary' | 'secondary';
      permissions: MemberPermissions;
      created_by: string;
    }) => {
      const { data, error } = await supabase
        .from('circle_invites')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as CircleInvite;
    },
    onSuccess: (invite) => {
      qc.invalidateQueries({ queryKey: ['circle-members', invite.care_circle_id] });
    },
  });
}

export function useUpdateMemberPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      memberId,
      careCircleId,
      permissions,
    }: {
      memberId: string;
      careCircleId: string;
      permissions: Partial<MemberPermissions>;
    }) => {
      const { data, error } = await supabase
        .from('circle_members')
        .update({ permissions })
        .eq('id', memberId)
        .select()
        .single();
      if (error) throw error;
      return data as CircleMember;
    },
    onSuccess: (member) => {
      qc.invalidateQueries({ queryKey: ['circle-members', member.care_circle_id] });
    },
  });
}
