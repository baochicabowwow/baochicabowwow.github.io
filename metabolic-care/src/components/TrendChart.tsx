import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { colors, spacing } from './ui';
import type { DailyNutrientIntake } from '../lib/database.types';

interface Props {
  data: DailyNutrientIntake[];
  unit: string;
  width?: number;
  height?: number;
}

const CHART_H = 160;
const PADDING = { top: 12, right: 12, bottom: 32, left: 44 };

export function TrendChart({ data, unit, width = 320, height = CHART_H }: Props) {
  if (!data.length) return null;

  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  const maxValue = Math.max(...data.map((d) => d.total_amount), ...data.map((d) => d.effective_limit ?? 0), 1);
  const barW = Math.max(8, chartW / data.length - 4);

  function y(value: number) {
    return chartH - (value / maxValue) * chartH;
  }

  // Format date label as "M/D"
  function dateLabel(iso: string) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  // Y-axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxValue * f));

  return (
    <Svg width={width} height={height}>
      <G transform={`translate(${PADDING.left}, ${PADDING.top})`}>
        {/* Y-axis gridlines + labels */}
        {ticks.map((tick) => (
          <G key={tick}>
            <Line
              x1={0}
              y1={y(tick)}
              x2={chartW}
              y2={y(tick)}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            <SvgText
              x={-4}
              y={y(tick) + 4}
              textAnchor="end"
              fontSize={9}
              fill={colors.textMuted}
            >
              {tick}
            </SvgText>
          </G>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = Math.max(2, (d.total_amount / maxValue) * chartH);
          const x = i * (chartW / data.length) + (chartW / data.length - barW) / 2;
          const isOver = d.within_limit === false;

          return (
            <G key={d.log_date}>
              <Rect
                x={x}
                y={y(d.total_amount)}
                width={barW}
                height={barH}
                fill={isOver ? colors.danger : colors.primary}
                opacity={0.85}
                rx={2}
              />
              {/* Date label */}
              <SvgText
                x={x + barW / 2}
                y={chartH + 14}
                textAnchor="middle"
                fontSize={8}
                fill={colors.textMuted}
              >
                {dateLabel(d.log_date)}
              </SvgText>
            </G>
          );
        })}

        {/* Target line */}
        {data[0]?.effective_limit != null && (
          <Line
            x1={0}
            y1={y(data[0].effective_limit!)}
            x2={chartW}
            y2={y(data[0].effective_limit!)}
            stroke={colors.accent}
            strokeWidth={1.5}
            strokeDasharray="6,3"
          />
        )}
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.sm },
});
