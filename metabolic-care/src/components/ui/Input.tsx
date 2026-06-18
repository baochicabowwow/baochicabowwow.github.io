import React, { forwardRef } from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing } from './theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  hint?: string;
}

export const Input = forwardRef<TextInput, Props>(
  ({ label, error, containerStyle, hint, style, ...rest }, ref) => {
    return (
      <View style={[styles.container, containerStyle]}>
        {label ? <Text variant="label" style={styles.label}>{label}</Text> : null}
        <TextInput
          ref={ref}
          style={[styles.input, error ? styles.inputError : undefined, style]}
          placeholderTextColor={colors.textMuted}
          {...rest}
        />
        {error ? (
          <Text variant="caption" color={colors.danger} style={styles.message}>
            {error}
          </Text>
        ) : hint ? (
          <Text variant="caption" style={styles.message}>{hint}</Text>
        ) : null}
      </View>
    );
  },
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: { marginBottom: 2 },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.danger },
  message: { marginTop: 2 },
});
