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

/** Tarjeta de torneo en la lista: al pulsarla se abren las opciones del torneo. */
export function TournamentListItem({ tournament }: { tournament: Tournament }) {
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

  // Recaudado aprox.: buy-in + fee por cada jugador que entró al torneo y por
  // cada rebuy, más los add-ons cobrados en caja (si el torneo los tiene).
  const entered = tournament.playersCount ?? 0;
  const maxPlayers = tournament.maxPlayers;
  const reEntries = tournament.currentReEntries ?? 0;
  // Los add-ons no se guardan como reserva: se cobran como movimiento de caja,
  // así que van aparte el importe cobrado en el club, cuántos add-ons se
  // vendieron y cuántos jugadores distintos los hicieron.
  const addOnsAmount = tournament.addOnsAmount ?? 0;
  const addOnsCount = tournament.addOnsCount ?? 0;
  const addOnsPlayers = tournament.addOnsPlayersCount ?? 0;
  const collected = (tournament.buyIn + tournament.fee) * (entered + reEntries) + addOnsAmount;

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

  const isGoldCard = running;
  const titleColor = isGoldCard ? '#1E1602' : undefined;
  const subtextColor = isGoldCard ? 'rgba(30, 22, 2, 0.76)' : colors.textSecondary;
  const bodyTextColor = isGoldCard ? '#1E1602' : undefined;
  const liveBarBg = isGoldCard ? 'rgba(0, 0, 0, 0.08)' : colors.primaryMuted;
  const liveBarText = isGoldCard ? '#1E1602' : colors.primary;
  const dividerColor = isGoldCard ? 'rgba(30, 22, 2, 0.15)' : colors.border;

  return (
    <>
      <AppCard onPress={() => setActionsOpen(true)} style={styles.card} variant={running ? 'gold' : 'metallic'}>
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <AppText variant="subtitle" numberOfLines={1} style={titleColor ? { color: titleColor } : undefined}>
              {tournament.name}
            </AppText>
            <AppText variant="caption" style={{ color: subtextColor }}>
              {tournament.gameType?.name ?? t('table.noGameType')} • {formatDateTime(tournament.startDate)} •{' '}
              {tournament.mode === 'online' ? t('mode.online') : t('mode.live')}
            </AppText>
          </View>
          <TournamentStatusBadge
            status={tournament.status}
            color={isGoldCard ? '#F7DF9E' : undefined}
            backgroundColor={isGoldCard ? '#1E1602' : undefined}
          />
        </View>

        {current && (running || paused) ? (
          <View style={[styles.liveBar, { backgroundColor: liveBarBg }]}>
            <AppText variant="caption" weight="semibold" style={{ color: liveBarText }}>
              ▶ {currentLabel}
              {running ? ` • ${countdown.time}` : ''}
            </AppText>
            <AppText variant="caption" style={{ color: liveBarText }}>
              {t('tournament.elapsed')}: {countdown.elapsedTotal}
            </AppText>
          </View>
        ) : null}

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <AppText variant="caption" style={{ color: subtextColor }}>
              {t('table.buyIn')}
            </AppText>
            <AppText variant="body" weight="semibold" numberOfLines={1} style={bodyTextColor ? { color: bodyTextColor } : undefined}>
              {formatCurrency(tournament.buyIn, tournament.currency)}
              {tournament.fee > 0 ? ` + ${formatCurrency(tournament.fee, tournament.currency)}` : ''}
            </AppText>
          </View>
          <View style={styles.metaItem}>
            <AppText variant="caption" style={{ color: subtextColor }}>
              {t('tournament.players')}
            </AppText>
            <AppText variant="body" weight="semibold" numberOfLines={1} style={bodyTextColor ? { color: bodyTextColor } : undefined}>
              {maxPlayers == null
                ? formatNumber(entered)
                : `${formatNumber(entered)} / ${formatNumber(maxPlayers)}`}
            </AppText>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <AppText variant="caption" style={{ color: subtextColor }}>
              {t('tournament.reserved')}
            </AppText>
            <AppText variant="body" weight="semibold" numberOfLines={1} style={bodyTextColor ? { color: bodyTextColor } : undefined}>
              {formatNumber(tournament.reservedCount ?? 0)}
            </AppText>
          </View>
          <View style={styles.metaItem}>
            <AppText variant="caption" style={{ color: subtextColor }}>
              {t('tournament.playing')}
            </AppText>
            <AppText variant="body" weight="semibold" numberOfLines={1} style={bodyTextColor ? { color: bodyTextColor } : undefined}>
              {formatNumber(tournament.playingCount ?? 0)}
            </AppText>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <AppText variant="caption" style={{ color: subtextColor }}>
              {t('tournament.rebuys')}
            </AppText>
            <AppText variant="body" weight="semibold" numberOfLines={1} style={bodyTextColor ? { color: bodyTextColor } : undefined}>
              {formatNumber(tournament.currentReEntries ?? 0)}
            </AppText>
          </View>
          <View style={styles.metaItem}>
            <AppText variant="caption" style={{ color: subtextColor }}>
              {t('tournament.collected')}
            </AppText>
            <AppText variant="body" weight="semibold" numberOfLines={1} style={bodyTextColor ? { color: bodyTextColor } : undefined}>
              {formatCurrency(collected, tournament.currency)}
            </AppText>
          </View>
        </View>

        {addOnsAmount > 0 ? (
          <AppText variant="caption" style={[styles.breakdown, { color: subtextColor }]}>
            {t('tournament.collectedBreakdown', {
              entries: formatNumber(entered),
              reEntries: formatNumber(reEntries),
              addOnsAmount: formatCurrency(addOnsAmount, tournament.currency),
            })}
          </AppText>
        ) : null}

        {addOnsAmount > 0 ? (
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <AppText variant="caption" style={{ color: subtextColor }}>
                {t('tournament.addOns')}
              </AppText>
              <AppText variant="body" weight="semibold" numberOfLines={1} style={bodyTextColor ? { color: bodyTextColor } : undefined}>
                {formatNumber(addOnsCount)}
              </AppText>
            </View>
            <View style={styles.metaItem}>
              <AppText variant="caption" style={{ color: subtextColor }}>
                {t('tournament.addOnPlayers')}
              </AppText>
              <AppText variant="body" weight="semibold" numberOfLines={1} style={bodyTextColor ? { color: bodyTextColor } : undefined}>
                {formatNumber(addOnsPlayers)}
              </AppText>
            </View>
          </View>
        ) : null}

        {tournament.guaranteedPrize != null ? (
          <View style={[styles.footerRow, { borderTopColor: dividerColor }]}>
            <AppText variant="caption" style={{ color: subtextColor }}>
              {t('tournament.guaranteedPrize')}
            </AppText>
            <AppText variant="body" weight="semibold" style={bodyTextColor ? { color: bodyTextColor } : undefined}>
              {formatCurrency(tournament.guaranteedPrize, tournament.currency)}
            </AppText>
          </View>
        ) : null}

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
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  breakdown: { marginTop: 4 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  iconBtn: { minWidth: 36 },
});