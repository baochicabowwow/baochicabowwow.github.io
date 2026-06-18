import Constants from 'expo-constants';

function require(key: string): string {
  const value = Constants.expoConfig?.extra?.[key] ?? process.env[key];
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value as string;
}

export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};
