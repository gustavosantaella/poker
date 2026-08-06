import { AppText } from './AppText';
import { useTheme } from '@/theme';

export type BadgeTone =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted'
  | 'info'
  | 'accent';

export interface AppBadgeProps {
  label: string;
  tone?: BadgeTone;
}

/** Etiqueta pequeña de estado con color de fondo suave. */
export function AppBadge({ label, tone = 'muted' }: AppBadgeProps) {
  const { colors } = useTheme();

  const background: Record<BadgeTone, string> = {
    primary: colors.primaryMuted,
    success: colors.successMuted,
    warning: colors.warningMuted,
    danger: colors.dangerMuted,
    muted: colors.surfaceMuted,
    info: colors.infoMuted,
    accent: colors.primaryMuted,
  };

  const foreground: Record<BadgeTone, string> = {
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    muted: colors.textSecondary,
    info: colors.info,
    accent: colors.accent,
  };

  return (
    <AppText
      variant="caption"
      weight="semibold"
      color={foreground[tone]}
      style={{ backgroundColor: background[tone], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' }}
    >
      {label}
    </AppText>
  );
}