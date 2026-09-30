import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { StatCard } from '@/components/features/StatCard';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppSegmentedControl } from '@/components/ui/AppSegmentedControl';
import { AppText } from '@/components/ui/AppText';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ListItem } from '@/components/ui/ListItem';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Option } from '@/constants';
import {
  useClubCashMovements,
  useClubCashPlayers,
  useClubCashSummary,
  useClubCashTournaments,
  useDeleteClubCashMovement,
  useSettleClubCash,
  useSyncClubCash,
} from '@/hooks/use-queries';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import {
  ClubCashPeriod,
  cashMethodLabelKey,
  cashPeriodQuery,
  cashTypeIcon,
  cashTypeLabelKey,
} from '@/utils/cash';
import { formatCurrency, formatDate } from '@/utils/format';
import { CashMovementRow } from './ClubCashRows';
import { ClubCashMovementModal } from './ClubCashMovementModal';
import { ClubCashPlayerModal } from './ClubCashPlayerModal';
import { ClubCashTournamentModal } from './ClubCashTournamentModal';

export interface ClubCashPanelProps {
  clubId: number;
  /** Solo el admin del club puede borrar movimientos de caja. */
  canDelete?: boolean;
}

/**
 * Módulo "Recaudado": cuánto dinero ha entrado y salido de la caja del club,
 * qué jugador pagó y cuánto invirtió en cada torneo, y qué queda por cobrar.
 * Visible para el admin, el operador y el cajero del club.
 */
export function ClubCashPanel({
  clubId,
  canDelete = false,
}: ClubCashPanelProps) {
  const { t } = useI18n();
  const { colors } = useTheme();

  // "Recaudado" abre en el día en curso: es la caja que interesa al llegar al club.
  const [period, setPeriod] = useState<ClubCashPeriod>('today');
  const [notice, setNotice] = useState<string | null>(null);
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementTournamentId, setMovementTournamentId] = useState<
    number | null
  >(null);
  const [openTournamentId, setOpenTournamentId] = useState<number | null>(null);
  const [openPlayerId, setOpenPlayerId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const query = useMemo(() => cashPeriodQuery(period), [period]);
  const { data: summary, isLoading } = useClubCashSummary(clubId, query);
  const { data: tournaments } = useClubCashTournaments(clubId, query);
  const { data: players } = useClubCashPlayers(clubId, query);
  const { data: movements } = useClubCashMovements(clubId, {
    ...query,
    limit: 20,
  });
  const sync = useSyncClubCash(clubId);
  const settle = useSettleClubCash(clubId);
  const deleteMovement = useDeleteClubCashMovement(clubId);

  const currency = summary?.currency ?? 'USD';
  const money = (value: number) => formatCurrency(value, currency);
  const periodOptions: Option[] = [
    { label: t('club.cash.today'), value: 'today' },
    { label: t('club.cash.week'), value: 'week' },
    { label: t('club.cash.month'), value: 'month' },
    { label: t('club.cash.all'), value: 'all' },
  ];

  const handleSync = async () => {
    try {
      const result = await sync.mutateAsync({});
      setNotice(
        result.created + result.updated + result.removed === 0
          ? t('club.cash.synced')
          : t('club.cash.syncResult', {
              created: result.created,
              updated: result.updated,
            }),
      );
    } catch {
      setNotice(null);
    }
  };

  const handleCollectTournament = async (tournamentId: number) => {
    try {
      // "Cobrar" solo cobra el dinero que entra: los premios pendientes no se pagan aquí.
      const result = await settle.mutateAsync({
        status: 'paid',
        tournamentId,
        direction: 'in',
      });
      setNotice(
        t('club.cash.collectedResult', {
          count: result.updated,
          amount: money(result.amount),
        }),
      );
    } catch {
      setNotice(null);
    }
  };

  const handleDeleteMovement = async () => {
    if (deleteTarget === null) return;
    try {
      await deleteMovement.mutateAsync(deleteTarget);
      setNotice(t('club.cash.movementDeleted'));
    } catch {
      setNotice(null);
    } finally {
      setDeleteTarget(null);
    }
  };
  if (isLoading && !summary) {
    return (
      <AppText
        variant="caption"
        color={colors.textSecondary}
        style={styles.empty}
      >
        {t('common.loading')}
      </AppText>
    );
  }

  return (
    <View>
      <AppSegmentedControl
        value={period}
        options={periodOptions}
        onChange={(value) => setPeriod(value as ClubCashPeriod)}
      />

      {notice ? (
        <AppText variant="caption" color={colors.success} style={styles.notice}>
          {notice}
        </AppText>
      ) : null}

      {/* Dinero de las reservas que todavía no está en caja */}
      {summary && summary.unregistered > 0 ? (
        <AppCard style={styles.banner}>
          <AppText variant="label" color={colors.warning}>
            {`${t('club.cash.unregistered')}: ${money(summary.unregistered)}`}
          </AppText>
          <AppText
            variant="caption"
            color={colors.textSecondary}
            style={styles.bannerText}
          >
            {t('club.cash.unregisteredHint', {
              count: summary.pendingCount + summary.paidCount,
            })}
          </AppText>
          <AppButton
            title={t('club.cash.syncNow')}
            size="sm"
            icon="sync-outline"
            loading={sync.isPending}
            onPress={() => void handleSync()}
          />
        </AppCard>
      ) : null}

      {summary ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={230}
            decelerationRate="fast"
            contentContainerStyle={styles.statsRow}
          >
            <StatCard
              label={t('club.cash.collected')}
              value={money(summary.collected)}
              icon="cash-outline"
              tone="success"
            />
            <StatCard
              label={t('club.cash.pending')}
              value={money(summary.pendingIn)}
              icon="time-outline"
              tone={summary.pendingIn > 0 ? 'warning' : 'muted'}
            />
            <StatCard
              label={t('club.cash.prizesPaid')}
              value={money(summary.paidOut)}
              icon="trophy-outline"
              tone="accent"
            />
            <StatCard
              label={t('club.cash.net')}
              value={money(summary.net)}
              icon="trending-up-outline"
              tone="info"
            />
            <StatCard
              label={t('club.cash.commission')}
              value={money(summary.commission)}
              icon="receipt-outline"
              tone="primary"
            />
            <StatCard
              label={t('club.cash.prizePot')}
              value={money(summary.prizePot)}
              icon="albums-outline"
              tone="info"
            />
            <StatCard
              label={t('club.cash.averageTicket')}
              value={money(summary.averageTicket)}
              icon="pricetag-outline"
              tone="primary"
            />
            <StatCard
              label={t('club.cash.balance')}
              value={money(summary.balance)}
              icon="wallet-outline"
              tone="success"
            />
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={230}
            decelerationRate="fast"
            contentContainerStyle={styles.statsRow}
          >
            <StatCard
              label={t('club.cash.entries')}
              value={summary.entries}
              icon="log-in-outline"
              tone="primary"
            />
            <StatCard
              label={t('club.cash.reEntries')}
              value={summary.reEntries}
              icon="refresh-outline"
              tone="info"
            />
            <StatCard
              label={t('club.cash.addOns')}
              value={summary.addOns}
              icon="add-circle-outline"
              tone="accent"
            />
            <StatCard
              label={t('club.cash.players')}
              value={summary.players}
              icon="people-outline"
              tone="success"
            />
            <StatCard
              label={t('club.cash.movements')}
              value={summary.paidCount}
              icon="list-outline"
              tone="muted"
            />
          </ScrollView>

          <AppText
            variant="caption"
            color={colors.textSecondary}
            style={styles.hint}
          >
            {`${t('club.cash.periodSummary', {
              days: summary.periodDays,
              players: summary.players,
              tournaments: summary.tournaments,
            })} · ${summary.from} → ${summary.to}`}
          </AppText>
          <AppText
            variant="caption"
            color={colors.textMuted}
            style={styles.hint}
          >
            {t('club.cash.currencyNote')}
          </AppText>
        </>
      ) : null}
      {/* Entradas y salidas por tipo de movimiento */}
      {summary && summary.byType.length > 0 ? (
        <>
          <SectionHeader title={t('club.cash.byType')} />
          <AppCard padded={false}>
            {summary.byType.map((row) => (
              <ListItem
                key={row.type}
                title={`${t(cashTypeLabelKey(row.type))} · ${row.count}`}
                subtitle={
                  row.pending > 0
                    ? `${t('club.cash.pending')}: ${money(row.pending)}`
                    : undefined
                }
                icon={cashTypeIcon(row.type)}
                iconColor={
                  row.direction === 'in' ? colors.success : colors.danger
                }
                right={
                  <AppText
                    variant="body"
                    weight="semibold"
                    color={
                      row.direction === 'in' ? colors.success : colors.danger
                    }
                  >
                    {`${row.direction === 'in' ? '+' : '-'}${money(row.amount)}`}
                  </AppText>
                }
              />
            ))}
          </AppCard>
          {summary.byMethod.length > 0 ? (
            <AppText
              variant="caption"
              color={colors.textSecondary}
              style={styles.hint}
            >
              {`${t('club.cash.byMethod')}: ${summary.byMethod
                .map(
                  (method) =>
                    `${t(cashMethodLabelKey(method.method))} ${money(method.amount)}`,
                )
                .join(' · ')}`}
            </AppText>
          ) : null}
        </>
      ) : null}

      {/* Recaudado por torneo */}
      <SectionHeader title={t('club.cash.byTournament')} />
      <AppCard padded={false}>
        {(tournaments ?? []).length === 0 ? (
          <AppText
            variant="caption"
            color={colors.textMuted}
            style={styles.empty}
          >
            {t('club.cash.noTournaments')}
          </AppText>
        ) : (
          (tournaments ?? []).map((tournament) => (
            <ListItem
              key={tournament.tournamentId}
              title={tournament.name}
              subtitle={[
                formatDate(tournament.startDate),
                `${t('club.cash.entries')}: ${tournament.entries}`,
                `${t('club.cash.collected')}: ${formatCurrency(tournament.collected, tournament.currency)}`,
                `${t('club.cash.pending')}: ${formatCurrency(tournament.pendingIn, tournament.currency)}`,
                tournament.pendingOut > 0
                  ? `${t('club.cash.pendingPayments')}: ${formatCurrency(
                      tournament.pendingOut,
                      tournament.currency,
                    )}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              icon="trophy-outline"
              chevron
              onPress={() => setOpenTournamentId(tournament.tournamentId)}
              right={
                tournament.pendingIn > 0 ? (
                  <AppButton
                    title={t('club.cash.collect')}
                    size="sm"
                    variant="secondary"
                    onPress={() =>
                      void handleCollectTournament(tournament.tournamentId)
                    }
                  />
                ) : (
                  <AppBadge label={t('club.cash.paidBadge')} tone="success" />
                )
              }
            />
          ))
        )}
      </AppCard>
      {/* Jugadores que más han invertido */}
      <SectionHeader title={t('club.cash.topInvestors')} />
      <AppCard padded={false}>
        {(players ?? []).length === 0 ? (
          <AppText
            variant="caption"
            color={colors.textMuted}
            style={styles.empty}
          >
            {t('club.cash.noPlayers')}
          </AppText>
        ) : (
          (players ?? []).slice(0, 10).map((player, index) => (
            <ListItem
              key={player.userId}
              title={`${index + 1}. ${player.name}`}
              subtitle={t('club.cash.playerSubtitle', {
                entries: player.entries,
                reEntries: player.reEntries,
                invested: formatCurrency(player.invested, currency),
              })}
              icon="person-outline"
              chevron
              onPress={() => setOpenPlayerId(player.userId)}
              right={
                <View style={styles.playerRight}>
                  <AppText variant="body" weight="semibold">
                    {formatCurrency(player.invested, currency)}
                  </AppText>
                  {player.pending > 0 ? (
                    <AppBadge
                      label={`${t('club.cash.pendingBadge')} ${formatCurrency(player.pending, currency)}`}
                      tone="warning"
                    />
                  ) : (
                    <AppBadge
                      label={`${player.net >= 0 ? '+' : ''}${formatCurrency(player.net, currency)}`}
                      tone={player.net >= 0 ? 'success' : 'danger'}
                    />
                  )}
                </View>
              }
            />
          ))
        )}
      </AppCard>

      {/* Libro de caja: últimos movimientos */}
      <SectionHeader title={t('club.cash.lastMovements')} />
      <AppCard padded={false}>
        {(movements?.items ?? []).length === 0 ? (
          <AppText
            variant="caption"
            color={colors.textMuted}
            style={styles.empty}
          >
            {t('club.cash.noMovements')}
          </AppText>
        ) : (
          (movements?.items ?? []).map((movement) => (
            <CashMovementRow
              key={movement.id}
              movement={movement}
              currency={currency}
              onPress={
                movement.status === 'void'
                  ? undefined
                  : () =>
                      void settle.mutateAsync({
                        status: movement.status === 'paid' ? 'pending' : 'paid',
                        movementIds: [movement.id],
                      })
              }
              onDelete={
                canDelete ? () => setDeleteTarget(movement.id) : undefined
              }
            />
          ))
        )}
      </AppCard>

      {movements && movements.total > movements.items.length ? (
        <AppText variant="caption" color={colors.textMuted} style={styles.hint}>
          {`${t('club.cash.movements')}: ${formatCurrency(movements.totals.collected, currency)} ${t(
            'club.cash.collected',
          ).toLowerCase()} · ${formatCurrency(movements.totals.paidOut, currency)} ${t(
            'club.cash.paidOut',
          ).toLowerCase()}`}
        </AppText>
      ) : null}

      <AppButton
        title={t('club.cash.addMovement')}
        icon="add"
        fullWidth
        style={styles.addButton}
        onPress={() => {
          setMovementTournamentId(null);
          setMovementOpen(true);
        }}
      />

      <ClubCashTournamentModal
        clubId={clubId}
        tournamentId={openTournamentId ?? 0}
        visible={openTournamentId !== null}
        onClose={() => setOpenTournamentId(null)}
        onNotice={setNotice}
        canDelete={canDelete}
        onRegisterMovement={(tournamentId) => {
          setOpenTournamentId(null);
          setMovementTournamentId(tournamentId);
          setMovementOpen(true);
        }}
      />

      <ClubCashPlayerModal
        clubId={clubId}
        userId={openPlayerId ?? 0}
        visible={openPlayerId !== null}
        query={query}
        currency={currency}
        onClose={() => setOpenPlayerId(null)}
      />

      <ClubCashMovementModal
        clubId={clubId}
        visible={movementOpen}
        defaultTournamentId={movementTournamentId}
        onClose={() => setMovementOpen(false)}
        onSaved={setNotice}
      />

      {/* Borrar un movimiento mal registrado (solo el admin del club) */}
      <ConfirmModal
        visible={deleteTarget !== null}
        title={t('club.cash.removeMovement')}
        message={t('club.cash.removeMovementMessage')}
        confirmLabel={t('club.cash.removeMovement')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={deleteMovement.isPending}
        onConfirm={() => void handleDeleteMovement()}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { gap: 10, paddingRight: 8, marginBottom: 10 },
  hint: { marginBottom: 12 },
  notice: { marginBottom: 8 },
  empty: { padding: 16 },
  banner: { marginBottom: 12, gap: 6 },
  bannerText: { marginBottom: 4 },
  playerRight: { alignItems: 'flex-end', gap: 4 },
  addButton: { marginTop: 8, marginBottom: 12 },
});
