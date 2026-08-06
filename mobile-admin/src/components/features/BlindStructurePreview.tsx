import { BlindStructureItem, BlindStructureSummary } from '@/api/types';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { LoadingView } from '@/components/ui/LoadingView';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { formatDuration } from '@/utils/format';
import { StyleSheet, View } from 'react-native';

export interface BlindStructurePreviewProps {
  items: BlindStructureItem[] | null | undefined;
  summary: BlindStructureSummary | null | undefined;
  loading?: boolean;
  error?: string;
}

/** Tabla de niveles + resumen de la estructura de ciegas generada. */
export function BlindStructurePreview({
  items,
  summary,
  loading = false,
  error,
}: BlindStructurePreviewProps) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <AppCard>
        <LoadingView label="Generating blind structure..." />
      </AppCard>
    );
  }

  if (error) {
    return (
      <AppCard>
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      </AppCard>
    );
  }

  if (!items || items.length === 0) {
    return (
      <AppCard>
        <AppText variant="caption" color={colors.textSecondary}>
          Fill in the structure fields and press “Preview” to generate the blind levels.
        </AppText>
      </AppCard>
    );
  }

  return (
    <View style={styles.wrap}>
      {summary ? (
        <View style={[styles.summary, { backgroundColor: colors.primaryMuted }]}>
          <AppText variant="caption" weight="semibold" color={colors.primary}>
            {summary.levelCount} levels • {summary.breakCount} breaks • Est.{' '}
            {formatDuration(summary.estimatedDurationMin)}
          </AppText>
        </View>
      ) : null}

      {items.map((item) => {
        if (item.type === 'break') {
          return (
            <View key={`break-${item.afterLevel}`} style={[styles.break, { backgroundColor: colors.surfaceMuted }]}>
              <AppText variant="caption" weight="semibold" color={colors.warning}>
                ☕ Break • {item.durationMin} min
              </AppText>
              <AppText variant="caption">after level {item.afterLevel}</AppText>
            </View>
          );
        }
        return (
          <View key={`level-${item.level}`} style={[styles.row, { borderBottomColor: colors.border }]}>
            <AppText variant="body" weight="semibold" style={styles.level}>
              L{item.level}
            </AppText>
            <AppText variant="body" weight="medium">
              {item.smallBlind}/{item.bigBlind}
            </AppText>
            <AppText variant="caption" color={item.ante > 0 ? colors.warning : colors.textMuted}>
              {item.ante > 0 ? `ante ${item.ante}` : 'no ante'}
            </AppText>
            <AppText variant="caption">{item.durationMin} min</AppText>
          </View>
        );
      })}

      {summary?.finalLevel ? (
        <AppText variant="caption" style={styles.note}>
          Estimated end: {summary.finalLevel.smallBlind}/{summary.finalLevel.bigBlind} (BB ≈ 5% of stack).
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  summary: { padding: spacing.sm, borderRadius: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  level: { width: 36 },
  break: { padding: spacing.sm, borderRadius: 10 },
  note: { marginTop: spacing.xs },
});