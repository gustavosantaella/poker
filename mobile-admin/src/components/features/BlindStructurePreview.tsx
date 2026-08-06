import { BlindStructureItem, BlindStructureSummary } from '@/api/types';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { LoadingView } from '@/components/ui/LoadingView';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { formatChips, formatDuration } from '@/utils/format';
import { StyleSheet, View } from 'react-native';

export interface BlindStructurePreviewProps {
  items: BlindStructureItem[] | null | undefined;
  summary: BlindStructureSummary | null | undefined;
  loading?: boolean;
  error?: string;
  lateRegistrationLevel?: number | null;
  addOnLevel?: number | null;
  reEntryUnlimited?: boolean;
}

/** Tabla de niveles + resumen de la estructura de ciegas generada. */
export function BlindStructurePreview({
  items,
  summary,
  loading = false,
  error,
  lateRegistrationLevel = null,
  addOnLevel = null,
  reEntryUnlimited = false,
}: BlindStructurePreviewProps) {
  const { colors } = useTheme();
  const { t } = useI18n();

  if (loading) {
    return (
      <AppCard>
        <LoadingView label={t('structure.generating')} />
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
          {t('structure.hint')}
        </AppText>
      </AppCard>
    );
  }

  return (
    <View style={styles.wrap}>
      {summary ? (
        <View style={[styles.summary, { backgroundColor: colors.primaryMuted }]}>
          <AppText variant="caption" weight="semibold" color={colors.primary}>
            {t('structure.summary', {
              levels: summary.levelCount,
              breaks: summary.breakCount,
              duration: formatDuration(summary.estimatedDurationMin),
            })}
          </AppText>
          {lateRegistrationLevel != null ? (
            <AppText variant="caption" color={colors.warning}>
              ⛔ {t('structure.registrationClosesAt', { level: lateRegistrationLevel })}
            </AppText>
          ) : null}
          {addOnLevel != null ? (
            <AppText variant="caption" color={colors.primary}>
              ➕ {t('structure.addOnEndsAt', { level: addOnLevel })}
            </AppText>
          ) : null}
          {reEntryUnlimited ? (
            <AppText variant="caption" color={colors.primary}>
              🔄 {t('structure.reEntryUnlimited')}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {items.map((item) => {
        if (item.type === 'break') {
          return (
            <View key={`break-${item.afterLevel}`} style={[styles.break, { backgroundColor: colors.surfaceMuted }]}>
              <AppText variant="caption" weight="semibold" color={colors.warning}>
                {t('structure.breakLabel', { minutes: item.durationMin })}
              </AppText>
              <AppText variant="caption">{t('structure.afterLevel', { level: item.afterLevel })}</AppText>
            </View>
          );
        }
        return (
          <View key={`level-${item.level}`}>
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <AppText variant="body" weight="semibold" style={styles.level}>
                L{item.level}
              </AppText>
              <AppText variant="body" weight="medium">
                {formatChips(item.smallBlind)}/{formatChips(item.bigBlind)}
              </AppText>
              <AppText variant="caption" color={item.ante > 0 ? colors.warning : colors.textMuted}>
                {item.ante > 0 ? t('structure.ante', { ante: formatChips(item.ante) }) : t('structure.noAnte')}
              </AppText>
              <AppText variant="caption">{t('structure.minutes', { minutes: item.durationMin })}</AppText>
            </View>
            {lateRegistrationLevel != null && item.level === lateRegistrationLevel ? (
              <AppText variant="caption" color={colors.warning} style={styles.marker}>
                ⛔ {t('structure.registrationClosesAt', { level: item.level })}
              </AppText>
            ) : null}
            {addOnLevel != null && item.level === addOnLevel ? (
              <AppText variant="caption" color={colors.primary} style={styles.marker}>
                ➕ {t('structure.addOnEndsAt', { level: item.level })}
              </AppText>
            ) : null}
          </View>
        );
      })}

      {summary?.finalLevel ? (
        <AppText variant="caption" style={styles.note}>
          {t('structure.estimatedEnd', {
            smallBlind: formatChips(summary.finalLevel.smallBlind),
            bigBlind: formatChips(summary.finalLevel.bigBlind),
          })}
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
  marker: { marginLeft: 36, marginBottom: 4 },
});