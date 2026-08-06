import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Tournament } from '@/api/types';
import { TournamentActionsSheet } from '@/components/features/TournamentActionsSheet';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { TournamentStatusBadge } from '@/components/ui/StatusBadge';
import { usePauseTournament, useResumeTournament, useStartTournament } from '@/hooks/use-queries';
import { useTournamentCountdown } from '@/hooks/use-tournament-countdown';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { formatCurrency, formatDateTime, formatNumber } from '@/utils/format';

export function TournamentListItem({ tournament, onPress }: { tournament: Tournament; onPress: () => void }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [actionsOpen, setActionsOpen] = useState(false);
  const countdown = useTournamentCountdown(tournament);
  const start = useStartTournament();
  const pause = usePauseTournament();
  const resume = useResumeTournament();

  const running = tournament.status === 'running';
  const paused = tournament.status === 'paused';
  const canControl =
    running || paused || tournament.status === 'scheduled' || tournament.status === 'registering';

  const handleStartPause = () => {
    if (running) void pause.mutateAsync(tournament.id).catch(() => undefined);
    else if (paused) void resume.mutateAsync(tournament.id).catch(() => undefined);
    else void start.mutateAsync(tournament.id).catch(() => undefined);
  };

  const current = countdown.currentItem;
  const currentLabel = current
    ? current.type === 'break'
      ? t('tournament.breakShort')
      : t('tournament.levelShort', { level: current.level })
    : null;

  return (
    <>
      <AppCard onPress={onPress} style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <AppText variant="subtitle" numberOfLines={1}>
              {tournament.name}
            </AppText>
            <AppText variant="caption">
              {tournament.gameType?.name ?? t('table.noGameType')} • {formatDateTime(tournament.startDate)}
            </AppText>
          </View>
          <TournamentStatusBadge status={tournament.status} />
        </View>

        {current && (running || paused) ? (
          <View style={[styles.liveBar, { backgroundColor: colors.primaryMuted }]}>
            <AppText variant="caption" weight="semibold" color={colors.primary}>
              ▶ {currentLabel}
              {running ? ` • ${countdown.time}` : ''}
            </AppText>
          </View>
        ) : null}

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <AppText variant="caption" color={colors.textSecondary}>
              {t('table.buyIn')}
            </AppText>
            <AppText variant="body" weight="semibold">
              {formatCurrency(tournament.buyIn)}
              {tournament.fee > 0 ? ` + ${formatCurrency(tournament.fee)}` : ''}
            </AppText>
          </View>
          <View style={styles.metaItem}>
            <AppText variant="caption" color={colors.textSecondary}>
              {t('tournament.stack')}
            </AppText>
            <AppText variant="body" weight="semibold">
              {formatNumber(tournament.startingStack)}
            </AppText>
          </View>
          <View style={styles.metaItem}>
            <AppText variant="caption" color={colors.textSecondary}>
              {t('tournament.players')}
            </AppText>
            <AppText variant="body" weight="semibold">
              {tournament.maxPlayers == null ? t('tournament.unlimited') : formatNumber(tournament.maxPlayers)}
            </AppText>
          </View>
        </View>

        <View style={styles.actions}>
          {canControl ? (
            <AppButton
              title=""
              icon={running ? 'pause' : 'play'}
              variant="secondary"
              size="sm"
              loading={start.isPending || pause.isPending || resume.isPending}
              onPress={handleStartPause}
              style={styles.iconBtn}
            />
          ) : null}
          <AppButton
            title=""
            icon="settings-outline"
            variant="ghost"
            size="sm"
            onPress={() => setActionsOpen(true)}
            style={styles.iconBtn}
          />
        </View>
      </AppCard>

      <TournamentActionsSheet tournament={tournament} visible={actionsOpen} onClose={() => setActionsOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  titleWrap: { flex: 1, marginRight: 8 },
  liveBar: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10, alignSelf: 'flex-start' },
  meta: { flexDirection: 'row', gap: 12 },
  metaItem: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  iconBtn: { minWidth: 36 },
});