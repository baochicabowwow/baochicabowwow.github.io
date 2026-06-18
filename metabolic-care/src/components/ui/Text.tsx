import React from 'react';
import { Text as RNText, type TextProps, type TextStyle, type StyleProp } from 'react-native';
import { typography } from './theme';

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'label' | 'caption';

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function Text({ variant = 'body', color, style, ...rest }: Props) {
  return (
    <RNText
      style={[typography[variant], color ? { color } : undefined, style]}
      {...rest}
    />
  );
}
