import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { AppText } from './AppText';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

export function Badge({ label, tone = 'primary' }: { label: string; tone?: BadgeTone }) {
  const { colors } = useTheme();
  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    primary: { bg: colors.primaryMuted, fg: colors.primary },
    success: { bg: colors.successMuted, fg: colors.success },
    warning: { bg: colors.warningMuted, fg: colors.warning },
    danger: { bg: colors.dangerMuted, fg: colors.danger },
    neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary },
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
  },
});
