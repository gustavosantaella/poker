import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';

export type StatTone = 'primary' | 'success' | 'warning' | 'accent' | 'info' | 'muted';

export interface StatCardProps {
  label: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: StatTone;
}

/** Tarjeta de estadistica para el dashboard. */
export function StatCard({ label, value, icon, tone = 'primary' }: StatCardProps) {
  const { colors } = useTheme();

  const tones: Record<StatTone, string> = {
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    accent: colors.accent,
    info: colors.info,
    muted: colors.textSecondary,
  };

  const color = tones[tone];

  const cardVariant = tone === 'warning' ? 'gold' : 'metallic';
  const isGoldCard = cardVariant === 'gold';

  // High contrast colors on gold cards
  const textColor = isGoldCard ? '#1E1602' : color;
  const iconColor = isGoldCard ? '#1E1602' : color;
  const iconWrapBg = isGoldCard ? 'rgba(0, 0, 0, 0.08)' : colors.primaryMuted;
  const labelColor = isGoldCard ? '#3A2F12' : undefined;

  return (
    <AppCard style={styles.card} variant={cardVariant}>
      <View style={[styles.iconWrap, { backgroundColor: iconWrapBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <AppText variant="number" color={textColor}>
        {value}
      </AppText>
      <AppText variant="caption" style={labelColor ? { color: labelColor } : undefined}>
        {label}
      </AppText>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});