import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { AppText } from './AppText';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'gold';

export function Badge({ label, tone = 'primary' }: { label: string; tone?: BadgeTone }) {
  const { colors } = useTheme();
  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    primary: { bg: colors.primaryMuted, fg: colors.primary },
    success: { bg: colors.successMuted, fg: colors.success },
    warning: { bg: colors.warningMuted, fg: colors.warning },
    danger: { bg: colors.dangerMuted, fg: colors.danger },
    neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary },
    // Dorado invertido: para usar encima de tarjetas doradas (texto oscuro legible).
    gold: { bg: 'rgba(30, 22, 2, 0.78)', fg: '#F4D889' },
  };
  const toneStyle = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: toneStyle.bg }]}>
      <AppText variant="caption" weight="semibold" color={toneStyle.fg}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    // Sombra sutil para despegar el badge del fondo.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
});
