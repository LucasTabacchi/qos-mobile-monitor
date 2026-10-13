/**
 * Design system — Network QoS Monitor
 * Material 3 Light Theme based on stitch_network_qos_monitor_prototype (3)
 *
 * Implements Google Material You (MD3) canonical palette, pill geometries,
 * elevated tonal surfaces, and semantic network quality indicators.
 */

export const QualityColors = {
  excellent: '#006B5F', // Green/Teal (Optimal)
  good: '#005BBF',      // Primary Blue
  fair: '#B95E00',      // Amber (Regular)
  poor: '#BA1A1A',      // Red (Critical/Poor)
  bad: '#BA1A1A',       // Critical
  noData: '#727785',     // Outline Neutral
} as const;

export type QualityLevel = keyof typeof QualityColors;

/** Maps a 0-100 signal score to a quality level */
export function scoreToQuality(score: number): QualityLevel {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'poor';
  return 'bad';
}

/** Maps RTT (ms) to quality */
export function rttToQuality(rttMs: number): QualityLevel {
  if (rttMs < 35) return 'excellent';
  if (rttMs < 60) return 'good';
  if (rttMs < 120) return 'fair';
  if (rttMs < 250) return 'poor';
  return 'bad';
}

/** Maps throughput (Mbps) to quality */
export function throughputToQuality(mbps: number): QualityLevel {
  if (mbps >= 50) return 'excellent';
  if (mbps >= 20) return 'good';
  if (mbps >= 5) return 'fair';
  if (mbps >= 1) return 'poor';
  return 'bad';
}

// ---------------------------------------------------------------------------
// MD3 Tonal Surfaces & Semantic Colors (Light Theme canonical)
// ---------------------------------------------------------------------------

export const Colors = {
  // Backgrounds & Surfaces
  bg: {
    primary: '#F8F9FA',           // surface / background
    secondary: '#F3F4F5',         // surface-container-low
    card: '#FFFFFF',              // surface-container-lowest
    elevated: '#EDEEEF',          // surface-container
    high: '#E7E8E9',              // surface-container-high
    highest: '#E1E3E4',           // surface-container-highest
    dim: '#D9DADB',               // surface-dim
    overlay: 'rgba(25, 28, 29, 0.4)',
  },
  // Borders & Outlines
  border: {
    subtle: '#EDEEEF',
    default: '#C1C6D6',           // outline-variant
    strong: '#727785',            // outline
  },
  // Text & On-Colors
  text: {
    primary: '#191C1D',           // on-surface
    secondary: '#414754',         // on-surface-variant
    tertiary: '#727785',          // outline
    muted: '#727785',
    inverse: '#FFFFFF',           // on-primary
  },
  // MD3 Accent Roles
  accent: {
    primary: '#005BBF',           // primary
    primaryContainer: '#1A73E8',  // primary-container
    onPrimaryContainer: '#FFFFFF',
    primaryFixed: '#D8E2FF',      // primary-fixed (pill background for active nav/chips)
    primaryFixedDim: '#ADC7FF',
    onPrimaryFixed: '#001A41',
    onPrimaryFixedVariant: '#004493',

    secondary: '#006B5F',         // secondary (teal)
    secondaryContainer: '#8DF5E4',
    onSecondaryContainer: '#007165',
    secondaryFixed: '#8DF5E4',
    secondaryFixedDim: '#70D8C8',
    onSecondaryFixed: '#00201C',
    onSecondaryFixedVariant: '#005048',

    tertiary: '#944A00',          // tertiary (amber)
    tertiaryContainer: '#B95E00',
    onTertiaryContainer: '#FFFFFF',
    tertiaryFixed: '#FFDCC6',
    tertiaryFixedDim: '#FFB785',
    onTertiaryFixed: '#301400',
    onTertiaryFixedVariant: '#713700',

    brand: '#1A73E8',
    glow: 'rgba(0, 91, 191, 0.14)',
    dim: 'rgba(0, 91, 191, 0.06)',
  },
  // Quality colors
  quality: QualityColors,
  // Error colors
  error: {
    main: '#BA1A1A',
    container: '#FFDAD6',
    onContainer: '#93000A',
    text: '#BA1A1A',
  },
  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

// ---------------------------------------------------------------------------
// Typography scale (Material 3 Roboto Flex scale)
// ---------------------------------------------------------------------------

export const Typography = {
  // Display — big metric values (live speed, big dBm)
  display: { fontSize: 44, fontWeight: '700' as const, letterSpacing: -0.5 },
  displayLarge: { fontSize: 56, fontWeight: '700' as const, letterSpacing: -1 },
  // Headlines
  h1: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.2 },
  h2: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.1 },
  h3: { fontSize: 16, fontWeight: '600' as const, letterSpacing: 0 },
  // Titles
  titleLarge: { fontSize: 22, fontWeight: '600' as const },
  titleMedium: { fontSize: 16, fontWeight: '600' as const, letterSpacing: 0.15 },
  titleSmall: { fontSize: 14, fontWeight: '600' as const, letterSpacing: 0.1 },
  // Body
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  // Labels (Pills, badges, headers)
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.5 },
  labelMedium: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.5 },
  labelLarge: { fontSize: 14, fontWeight: '600' as const, letterSpacing: 0.1 },
  labelSmall: { fontSize: 10, fontWeight: '600' as const, letterSpacing: 0.5 },
  // Monospace
  mono: { fontSize: 14, fontFamily: 'monospace', fontWeight: '600' as const, letterSpacing: -0.2 },
} as const;

// ---------------------------------------------------------------------------
// Spacing & Shape (Canonical MD3)
// ---------------------------------------------------------------------------

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,       // MD3 standard card
  xl: 24,       // MD3 large container
  full: 9999,   // MD3 pill
} as const;

// ---------------------------------------------------------------------------
// React Native Paper theme override (MD3 Light Theme)
// ---------------------------------------------------------------------------

export const paperTheme = {
  dark: false,
  colors: {
    primary: Colors.accent.primary,
    onPrimary: Colors.text.inverse,
    primaryContainer: Colors.accent.primaryFixed,
    onPrimaryContainer: Colors.accent.onPrimaryFixedVariant,
    secondary: Colors.accent.secondary,
    onSecondary: Colors.text.inverse,
    secondaryContainer: Colors.accent.secondaryContainer,
    onSecondaryContainer: Colors.accent.onSecondaryContainer,
    tertiary: Colors.accent.tertiary,
    onTertiary: Colors.text.inverse,
    error: Colors.error.main,
    onError: Colors.text.inverse,
    errorContainer: Colors.error.container,
    onErrorContainer: Colors.error.onContainer,
    background: Colors.bg.primary,
    onBackground: Colors.text.primary,
    surface: Colors.bg.card,
    onSurface: Colors.text.primary,
    surfaceVariant: Colors.bg.elevated,
    onSurfaceVariant: Colors.text.secondary,
    outline: Colors.border.strong,
    outlineVariant: Colors.border.default,
    inverseSurface: '#2E3132',
    inverseOnSurface: '#F0F1F2',
    inversePrimary: '#ADC7FF',
    elevation: {
      level0: 'transparent',
      level1: Colors.bg.card,
      level2: Colors.bg.secondary,
      level3: Colors.bg.elevated,
      level4: Colors.bg.high,
      level5: Colors.bg.highest,
    },
  },
  fonts: {} as any,
  animation: { scale: 1.0 },
  roundness: 16,
} as const;
