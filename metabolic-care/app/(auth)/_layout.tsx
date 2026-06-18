import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../src/features/auth/AuthContext';

export default function AuthLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) {
      router.replace('/(app)');
    }
  }, [session, loading]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
