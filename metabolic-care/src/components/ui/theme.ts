export const colors = {
  primary: '#1a6b4a',
  primaryLight: '#e8f5ee',
  primaryDark: '#134f38',
  accent: '#f0a500',
  accentLight: '#fef3db',
  danger: '#d94040',
  dangerLight: '#fdeaea',
  warning: '#e07800',
  warningLight: '#fff3e0',
  success: '#2e7d32',
  successLight: '#e8f5e9',
  text: '#1a1a1a',
  textSecondary: '#555',
  textMuted: '#888',
  border: '#e0e0e0',
  background: '#f8f9fa',
  surface: '#ffffff',
  surfaceAlt: '#f2f4f6',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 22, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.text },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, color: colors.textSecondary },
  label: { fontSize: 13, fontWeight: '600' as const, color: colors.textSecondary },
  caption: { fontSize: 11, fontWeight: '400' as const, color: colors.textMuted },
};
