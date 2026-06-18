import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'expo-router';
import { Screen, Button, Input, Text, colors, spacing } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';

const schema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  circleName: z.string().min(2, 'Family name is required'),
});
type FormData = z.infer<typeof schema>;

export default function SignUp() {
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { circleName: 'My Family' },
  });

  async function onSubmit({ displayName, email, password, circleName }: FormData) {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (error) {
      setLoading(false);
      Alert.alert('Sign up failed', error.message);
      return;
    }

    // Create the care circle for this primary caretaker
    if (data.user) {
      // Profile is auto-created by the DB trigger; we just need the circle
      const { data: circle, error: circleError } = await supabase
        .from('care_circles')
        .insert({ name: circleName, created_by: data.user.id })
        .select()
        .single();

      if (!circleError && circle) {
        // Add as primary member
        await supabase.from('circle_members').insert({
          care_circle_id: circle.id,
          user_id: data.user.id,
          role: 'primary',
          status: 'active',
          permissions: {
            can_log: true,
            can_view_analytics: true,
            can_edit_targets: true,
            can_manage_members: true,
            can_edit_foods: true,
          },
        });
      }
    }

    setLoading(false);
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
      >
        <View style={styles.header}>
          <Text variant="h1" color={colors.primary}>Create account</Text>
          <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
            You'll be the primary caretaker and can invite others later.
          </Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="displayName"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Your name"
                placeholder="Jane Smith"
                autoComplete="name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.displayName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="circleName"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Family / circle name"
                placeholder="Smith Family"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.circleName?.message}
                hint="Other caretakers will see this name"
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Email"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Password"
                placeholder="At least 8 characters"
                secureTextEntry
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
              />
            )}
          />
          <Button
            title="Create account"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.btn}
          />
        </View>

        <View style={styles.footer}>
          <Text variant="bodySmall" color={colors.textSecondary}>
            Already have an account?{' '}
          </Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Text variant="bodySmall" color={colors.primary} style={styles.link}>
                Sign in
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: spacing.xl, gap: spacing.sm },
  subtitle: { textAlign: 'center' },
  form: { gap: spacing.md },
  btn: { marginTop: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  link: { fontWeight: '600' },
});
