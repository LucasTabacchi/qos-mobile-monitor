import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Wifi, Signal, Radio } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radius, QualityColors } from '../../theme';
import type { QualityLevel } from '../../theme';

// ---------------------------------------------------------------------------
// Material 3 Card Primitives
// ---------------------------------------------------------------------------

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function CardHeader({ children, style }: CardProps) {
  return <View style={[styles.cardHeader, style]}>{children}</View>;
}

export function CardTitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.cardTitle, style]}>{children}</Text>;
}

export function CardDescription({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.cardDescription, style]}>{children}</Text>;
}

export function CardContent({ children, style }: CardProps) {
  return <View style={[styles.cardContent, style]}>{children}</View>;
}

// ---------------------------------------------------------------------------
// Material 3 Badge Primitive
// ---------------------------------------------------------------------------

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'tertiary';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({
  children,
  variant = 'secondary',
  style,
  textStyle,
}: BadgeProps) {
  const variantStyles = {
    default: styles.badgeDefault,
    secondary: styles.badgeSecondary,
    outline: styles.badgeOutline,
    destructive: styles.badgeDestructive,
    tertiary: styles.badgeTertiary,
  }[variant];

  const textVariantStyles = {
    default: styles.badgeTextDefault,
    secondary: styles.badgeTextSecondary,
    outline: styles.badgeTextOutline,
    destructive: styles.badgeTextDestructive,
    tertiary: styles.badgeTextTertiary,
  }[variant];

  return (
    <View style={[styles.badgeBase, variantStyles, style]}>
      {typeof children === 'string' ? (
        <Text style={[styles.badgeTextBase, textVariantStyles, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// QualityChip — MD3 Status Pill with animated/colored dot
// ---------------------------------------------------------------------------

interface QualityChipProps {
  level: QualityLevel;
  label?: string;
  style?: ViewStyle;
}

export function QualityChip({ level, label, style }: QualityChipProps) {
  const color = QualityColors[level];
  const displayLabel = label ?? level.toUpperCase();
  const isOptimal = level === 'excellent' || level === 'good';
  const bgColor = isOptimal ? Colors.accent.secondaryFixed : Colors.bg.high;
  const textColor = isOptimal ? Colors.accent.onSecondaryFixedVariant : color;

  return (
    <View style={[styles.qualityChip, { backgroundColor: bgColor }, style]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.qualityChipText, { color: textColor }]}>{displayLabel}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// MetricCard — 2-Column Bento Card for QoS Metrics
// ---------------------------------------------------------------------------

interface MetricCardProps {
  label: string;
  value: string | null;
  unit?: string;
  quality?: QualityLevel;
  icon?: React.ReactNode;
  badgeLabel?: string;
  style?: ViewStyle;
  onPress?: () => void;
}

export function MetricCard({
  label,
  value,
  unit,
  quality,
  icon,
  badgeLabel,
  style,
  onPress,
}: MetricCardProps) {
  const qualityColor = quality ? QualityColors[quality] : undefined;

  const content = (
    <View style={[styles.metricCard, style]}>
      <View style={styles.metricCardTop}>
        {icon ? <View style={styles.metricIconBox}>{icon}</View> : null}
        {badgeLabel ? (
          <View style={styles.metricPillBadge}>
            <Text style={styles.metricPillBadgeText}>{badgeLabel}</Text>
          </View>
        ) : quality ? (
          <QualityChip level={quality} style={styles.chipCompact} />
        ) : null}
      </View>

      <View style={styles.metricBottom}>
        <Text style={styles.metricCardLabel} numberOfLines={1}>{label}</Text>
        <View style={styles.valueRow}>
          {value !== null ? (
            <>
              <Text
                style={[
                  styles.metricCardValue,
                  qualityColor ? { color: Colors.text.primary } : null,
                ]}>
                {value}
              </Text>
              {unit ? <Text style={styles.metricCardUnit}>{unit}</Text> : null}
            </>
          ) : (
            <Text style={styles.noData}>—</Text>
          )}
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={style}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

// ---------------------------------------------------------------------------
// SectionHeader
// ---------------------------------------------------------------------------

interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
}

export function SectionHeader({ title, action, style }: SectionHeaderProps) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={action.onPress} activeOpacity={0.7}>
          <Text style={styles.sectionAction}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// NetworkTypeBadge — MD3 Pill Badge with Wifi/Cellular Icon
// ---------------------------------------------------------------------------

interface NetworkTypeBadgeProps {
  type: string;
  large?: boolean;
}

export function NetworkTypeBadge({ type, large }: NetworkTypeBadgeProps) {
  const isWifi = type.toUpperCase() === 'WIFI';
  const iconSize = large ? 16 : 14;

  return (
    <View style={[styles.networkBadge, large && styles.networkBadgeLarge]}>
      {isWifi ? (
        <Wifi size={iconSize} color={Colors.accent.primary} strokeWidth={2.5} />
      ) : type.toUpperCase() === 'CELLULAR' ? (
        <Radio size={iconSize} color={Colors.accent.primary} strokeWidth={2.5} />
      ) : (
        <Signal size={iconSize} color={Colors.accent.primary} strokeWidth={2.5} />
      )}
      <Text style={[styles.networkBadgeText, large && styles.networkBadgeTextLarge]}>
        {type}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Button — MD3 Pill Button with elevation and touch feedback
// ---------------------------------------------------------------------------

export interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  children,
  onPress,
  variant = 'default',
  size = 'default',
  iconLeft,
  iconRight,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const variantStyles = {
    default: styles.buttonDefault,
    secondary: styles.buttonSecondary,
    outline: styles.buttonOutline,
    ghost: styles.buttonGhost,
  }[variant];

  const sizeStyles = {
    default: styles.buttonSizeDefault,
    sm: styles.buttonSizeSm,
    lg: styles.buttonSizeLg,
    icon: styles.buttonSizeIcon,
  }[size];

  const textStyles = {
    default: styles.buttonTextDefault,
    secondary: styles.buttonTextSecondary,
    outline: styles.buttonTextOutline,
    ghost: styles.buttonTextGhost,
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        styles.buttonBase,
        variantStyles,
        sizeStyles,
        disabled && styles.buttonDisabled,
        style,
      ]}>
      {iconLeft ? <View style={styles.buttonIconLeft}>{iconLeft}</View> : null}
      {typeof children === 'string' ? (
        <Text style={[styles.buttonTextBase, textStyles, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
      {iconRight ? <View style={styles.buttonIconRight}>{iconRight}</View> : null}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Card
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    ...Typography.titleMedium,
    color: Colors.text.primary,
  },
  cardDescription: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  cardContent: {
    paddingTop: Spacing.xs,
  },

  // Badge
  badgeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
  },
  badgeDefault: {
    backgroundColor: Colors.accent.primaryFixed,
  },
  badgeSecondary: {
    backgroundColor: Colors.bg.elevated,
  },
  badgeOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  badgeDestructive: {
    backgroundColor: Colors.error.container,
  },
  badgeTertiary: {
    backgroundColor: Colors.accent.tertiaryFixed,
  },
  badgeTextBase: {
    ...Typography.labelSmall,
    fontWeight: '600',
  },
  badgeTextDefault: {
    color: Colors.accent.onPrimaryFixedVariant,
  },
  badgeTextSecondary: {
    color: Colors.text.secondary,
  },
  badgeTextOutline: {
    color: Colors.text.secondary,
  },
  badgeTextDestructive: {
    color: Colors.error.onContainer,
  },
  badgeTextTertiary: {
    color: Colors.accent.onTertiaryFixedVariant,
  },

  // QualityChip
  qualityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 2,
    gap: 5,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  qualityChipText: {
    ...Typography.labelSmall,
    fontWeight: '600',
  },
  chipCompact: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },

  // MetricCard (Bento Grid)
  metricCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    justifyContent: 'space-between',
    minHeight: 104,
  },
  metricCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  metricIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricPillBadge: {
    backgroundColor: Colors.accent.secondaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  metricPillBadgeText: {
    ...Typography.labelSmall,
    color: Colors.accent.onSecondaryFixedVariant,
    fontWeight: '600',
  },
  metricBottom: {
    flexDirection: 'column',
  },
  metricCardLabel: {
    ...Typography.labelMedium,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricCardValue: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  metricCardUnit: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
  },
  noData: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },

  // SectionHeader
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.titleSmall,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  sectionAction: {
    ...Typography.labelMedium,
    color: Colors.accent.primary,
    fontWeight: '600',
  },

  // NetworkTypeBadge
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bg.high,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  networkBadgeLarge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  networkBadgeText: {
    ...Typography.labelMedium,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  networkBadgeTextLarge: {
    ...Typography.titleSmall,
    color: Colors.text.primary,
    fontWeight: '700',
  },

  // Button
  buttonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  buttonSizeDefault: {
    height: 52,
    paddingHorizontal: Spacing.lg,
  },
  buttonSizeSm: {
    height: 36,
    paddingHorizontal: Spacing.md,
  },
  buttonSizeLg: {
    height: 56,
    paddingHorizontal: Spacing.xl,
    shadowColor: '#005BBF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonSizeIcon: {
    width: 44,
    height: 44,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDefault: {
    backgroundColor: Colors.accent.primary,
  },
  buttonSecondary: {
    backgroundColor: Colors.bg.high,
  },
  buttonOutline: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIconLeft: {
    marginRight: Spacing.sm,
  },
  buttonIconRight: {
    marginLeft: Spacing.sm,
  },
  buttonTextBase: {
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  buttonTextDefault: {
    color: Colors.text.inverse,
  },
  buttonTextSecondary: {
    color: Colors.text.primary,
  },
  buttonTextOutline: {
    color: Colors.text.primary,
  },
  buttonTextGhost: {
    color: Colors.accent.primary,
  },
});
