import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, radius } from './theme';

interface Props {
  percent: number; // 0–100
  color?: string;
  trackColor?: string;
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({
  percent,
  color,
  trackColor = colors.border,
  height = 10,
  style,
}: Props) {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const barColor =
    color ??
    (clampedPercent >= 100
      ? colors.danger
      : clampedPercent >= 85
        ? colors.warning
        : colors.primary);

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }, style]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clampedPercent}%`,
            backgroundColor: barColor,
            height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.full,
  },
});
