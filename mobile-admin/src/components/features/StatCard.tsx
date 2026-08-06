import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { AppText } from '@/components/ui/AppText';

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

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <AppText variant="number" color={color}>
        {value}
      </AppText>
      <AppText variant="caption">{label}</AppText>
    </View>
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