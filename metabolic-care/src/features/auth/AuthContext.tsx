import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import type { Profile, CareCircle } from '../../lib/database.types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  primaryCircle: CareCircle | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    primaryCircle: null,
    loading: true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUserData(session);
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadUserData(session);
      } else {
        setState({ session: null, user: null, profile: null, primaryCircle: null, loading: false });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadUserData(session: Session) {
    const [profileRes, circleRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      supabase
        .from('care_circles')
        .select('*, circle_members!inner(user_id, role, status)')
        .eq('circle_members.user_id', session.user.id)
        .eq('circle_members.status', 'active')
        .eq('circle_members.role', 'primary')
        .order('created_at')
        .limit(1)
        .single(),
    ]);

    setState({
      session,
      user: session.user,
      profile: profileRes.data ?? null,
      primaryCircle: circleRes.data ?? null,
      loading: false,
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    if (!state.user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', state.user.id).single();
    if (data) setState((s) => ({ ...s, profile: data }));
  }

  return (
    <AuthContext.Provider value={{ ...state, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
