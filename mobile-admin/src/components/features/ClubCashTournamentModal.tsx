import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppModal } from '@/components/ui/AppModal';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppText } from '@/components/ui/AppText';
import { AppTextField } from '@/components/ui/AppTextField';
import { ListItem } from '@/components/ui/ListItem';
import { LoadingView } from '@/components/ui/LoadingView';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Option } from '@/constants';
import {
  useClubCashTournament,
  useDeleteClubCashMovement,
  usePrizes,
  useRegisterClubCashPayouts,
  useSettleClubCash,
  useSyncClubCash,
} from '@/hooks/use-queries';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { formatCurrency, formatDate } from '@/utils/format';
import { CashMovementRow, CashStatRow } from './ClubCashRows';

export interface ClubCashTournamentModalProps {
  clubId: number;
  tournamentId: number;
  visible: boolean;
  onClose: () => void;
  /** Aviso para mostrar en la pantalla (cobros, premios, sincronización...). */
  onNotice?: (message: string) => void;
  onRegisterMovement?: (tournamentId: number) => void;
  /** Solo el admin del club puede borrar movimientos. */
  canDelete?: boolean;
}

/**
 * Caja de un torneo: cuánto se esperaba cobrar, cuánto se ha cobrado, quién pagó
 * y cuánto invirtió cada jugador, quién sigue a cobro y qué premios se pagaron.
 */
export function ClubCashTournamentModal({
  clubId,
  tournamentId,
  visible,
  onClose,
  onNotice,
  onRegisterMovement,
  canDelete = false,
}: ClubCashTournamentModalProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const activeTournamentId = visible ? tournamentId : 0;

  const { data: detail, isLoading } = useClubCashTournament(
    clubId,
    activeTournamentId,
  );
  const { data: prizes } = usePrizes(activeTournamentId);
  const sync = useSyncClubCash(clubId);
  const settle = useSettleClubCash(clubId);
  const deleteMovement = useDeleteClubCashMovement(clubId);
  const registerPayouts = useRegisterClubCashPayouts(
    clubId,
    activeTournamentId,
  );

  const [prizesOpen, setPrizesOpen] = useState(false);
  const [prizePlayers, setPrizePlayers] = useState<Record<number, number>>({});
  const [prizeAmounts, setPrizeAmounts] = useState<Record<number, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currency = detail?.summary.currency ?? 'USD';
  const playerOptions: Option[] = useMemo(
    () =>
      (detail?.players ?? []).map((player) => ({
        value: String(player.userId),
        label: player.name,
      })),
    [detail?.players],
  );

  // Al abrir (o cambiar de torneo) el formulario de premios arranca limpio.
  useEffect(() => {
    if (!visible) return;
    setPrizesOpen(false);
    setPrizePlayers({});
    setPrizeAmounts({});
    setError(null);
  }, [visible, tournamentId]);

  // Los importes de los premios se precargan con los del torneo.
  useEffect(() => {
    if (!prizes?.length) return;
    setPrizeAmounts((current) => {
      const next = { ...current };
      for (const prize of prizes) {
        if (next[prize.place] === undefined)
          next[prize.place] = String(prize.amount);
      }
      return next;
    });
  }, [prizes]);

  const money = (value: number) => formatCurrency(value, currency);
  const handleSync = async () => {
    try {
      const result = await sync.mutateAsync({ tournamentId });
      onNotice?.(
        result.created + result.updated + result.removed === 0
          ? t('club.cash.synced')
          : t('club.cash.syncResult', {
              created: result.created,
              updated: result.updated,
            }),
      );
    } catch (syncError) {
      setError(String(syncError));
    }
  };

  const handleCollectAll = async () => {
    try {
      // Solo se cobra lo que entra; los premios pendientes se pagan en "Registrar premios".
      const result = await settle.mutateAsync({
        status: 'paid',
        tournamentId,
        direction: 'in',
      });
      onNotice?.(
        t('club.cash.collectedResult', {
          count: result.updated,
          amount: money(result.amount),
        }),
      );
    } catch (collectError) {
      setError(String(collectError));
    }
  };

  const handleTogglePlayer = async (userId: number, pending: number) => {
    try {
      await settle.mutateAsync({
        status: pending > 0 ? 'paid' : 'pending',
        tournamentId,
        userId,
        direction: 'in',
      });
    } catch (toggleError) {
      setError(String(toggleError));
    }
  };

  const handleSavePrizes = async () => {
    const payouts = (prizes ?? [])
      .map((prize) => ({
        userId: prizePlayers[prize.place],
        place: prize.place,
        amount: Number((prizeAmounts[prize.place] ?? '').replace(',', '.')),
      }))
      .filter(
        (payout) =>
          payout.userId && Number.isFinite(payout.amount) && payout.amount >= 0,
      );
    if (payouts.length === 0) {
      setError(t('club.cash.playerRequired'));
      return;
    }
    try {
      await registerPayouts.mutateAsync(
        payouts.map((payout) => ({ ...payout, userId: Number(payout.userId) })),
      );
      setPrizesOpen(false);
      onNotice?.(t('club.cash.prizesSaved'));
    } catch (prizeError) {
      setError(String(prizeError));
    }
  };

  const summary = detail?.summary;

  return (
    <AppModal visible={visible} title={t('club.cash.detail')} onClose={onClose}>
      {isLoading || !detail || !summary ? (
        <LoadingView />
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <AppText variant="subtitle">{detail.tournament.name}</AppText>
          <AppText
            variant="caption"
            color={colors.textSecondary}
            style={styles.subtitle}
          >
            {`${formatDate(detail.tournament.startDate)} · ${formatCurrency(
              detail.tournament.buyIn + detail.tournament.fee,
              currency,
            )} · ${t('club.cash.players')}: ${summary.players}`}
          </AppText>

          <AppCard>
            <CashStatRow
              label={t('club.cash.expected')}
              value={money(summary.expected)}
            />
            <CashStatRow
              label={t('club.cash.collected')}
              value={money(summary.collected)}
              tone="success"
            />
            <CashStatRow
              label={t('club.cash.pending')}
              value={money(summary.pendingIn)}
              tone={summary.pendingIn > 0 ? 'warning' : 'muted'}
            />
            {summary.pendingOut > 0 ? (
              <CashStatRow
                label={t('club.cash.pendingPayments')}
                value={money(summary.pendingOut)}
                tone="danger"
              />
            ) : null}
            <CashStatRow
              label={t('club.cash.commission')}
              value={money(summary.commission)}
            />
            <CashStatRow
              label={t('club.cash.prizePot')}
              value={money(summary.prizePot)}
            />
            <CashStatRow
              label={t('club.cash.prizesPaid')}
              value={money(summary.prizesPaid)}
              tone="danger"
            />
            <CashStatRow
              label={t('club.cash.expenses')}
              value={money(summary.expenses)}
              tone="danger"
            />
            <CashStatRow
              label={t('club.cash.net')}
              value={money(summary.net)}
              tone="success"
            />
            {summary.voided > 0 ? (
              <CashStatRow
                label={t('club.cash.voidBadge')}
                value={money(summary.voided)}
                tone="muted"
              />
            ) : null}
            {summary.unregistered > 0 ? (
              <CashStatRow
                label={t('club.cash.unregistered')}
                value={money(summary.unregistered)}
                tone="warning"
              />
            ) : null}
          </AppCard>
          <View style={styles.actions}>
            {summary.unregistered > 0 ? (
              <AppButton
                title={t('club.cash.sync')}
                size="sm"
                variant="secondary"
                icon="sync-outline"
                loading={sync.isPending}
                onPress={() => void handleSync()}
              />
            ) : null}
            {summary.pendingIn > 0 ? (
              <AppButton
                title={t('club.cash.collectAll')}
                size="sm"
                icon="cash-outline"
                loading={settle.isPending}
                onPress={() => void handleCollectAll()}
              />
            ) : null}
            <AppButton
              title={t('club.cash.registerPrizes')}
              size="sm"
              variant="secondary"
              icon="trophy-outline"
              onPress={() => setPrizesOpen((open) => !open)}
            />
          </View>

          {prizesOpen ? (
            <>
              <SectionHeader title={t('club.cash.registerPrizes')} />
              <AppCard>
                <AppText
                  variant="caption"
                  color={colors.textSecondary}
                  style={styles.hint}
                >
                  {t('club.cash.prizesHint')}
                </AppText>
                {(prizes ?? []).length === 0 ? (
                  <AppText variant="caption" color={colors.textMuted}>
                    {t('club.cash.noPrizePlaces')}
                  </AppText>
                ) : (
                  (prizes ?? []).map((prize) => (
                    <View key={prize.place} style={styles.prizeRow}>
                      <AppText variant="label" style={styles.prizeLabel}>
                        {t('club.cash.prizePlace', { place: prize.place })}
                      </AppText>
                      <View style={styles.prizeFields}>
                        <View style={styles.prizeSelect}>
                          <AppSelect
                            value={
                              prizePlayers[prize.place]
                                ? String(prizePlayers[prize.place])
                                : undefined
                            }
                            options={playerOptions}
                            onSelect={(value) =>
                              setPrizePlayers((current) => ({
                                ...current,
                                [prize.place]: Number(value),
                              }))
                            }
                          />
                        </View>
                        <View style={styles.prizeAmount}>
                          <AppTextField
                            value={prizeAmounts[prize.place] ?? ''}
                            onChangeText={(value) =>
                              setPrizeAmounts((current) => ({
                                ...current,
                                [prize.place]: value,
                              }))
                            }
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>
                    </View>
                  ))
                )}
                <AppButton
                  title={t('club.cash.registerPrizes')}
                  fullWidth
                  loading={registerPayouts.isPending}
                  onPress={() => void handleSavePrizes()}
                />
              </AppCard>
            </>
          ) : null}
          <SectionHeader title={t('club.cash.playersOfTournament')} />
          <AppCard padded={false}>
            {detail.players.length === 0 ? (
              <AppText
                variant="caption"
                color={colors.textMuted}
                style={styles.empty}
              >
                {t('club.cash.noPlayers')}
              </AppText>
            ) : (
              detail.players.map((player) => (
                <ListItem
                  key={player.userId}
                  title={player.name}
                  subtitle={t('club.cash.playerSubtitle', {
                    entries: player.entries,
                    reEntries: player.reEntries,
                    invested: money(player.invested),
                  })}
                  icon="person-outline"
                  onPress={() =>
                    void handleTogglePlayer(player.userId, player.pending)
                  }
                  right={
                    <View style={styles.playerRight}>
                      <AppText variant="body" weight="semibold">
                        {money(player.invested)}
                      </AppText>
                      {player.pending > 0 ? (
                        <AppBadge
                          label={`${t('club.cash.pendingBadge')} ${money(player.pending)}`}
                          tone="warning"
                        />
                      ) : (
                        <AppBadge
                          label={t('club.cash.paidBadge')}
                          tone="success"
                        />
                      )}
                    </View>
                  }
                />
              ))
            )}
          </AppCard>
          <SectionHeader title={t('club.cash.movements')} />
          <AppCard padded={false}>
            {detail.movements.length === 0 ? (
              <AppText
                variant="caption"
                color={colors.textMuted}
                style={styles.empty}
              >
                {t('club.cash.detailEmpty')}
              </AppText>
            ) : (
              detail.movements.map((movement) => (
                <CashMovementRow
                  key={movement.id}
                  movement={movement}
                  currency={currency}
                  onPress={
                    movement.status === 'void'
                      ? undefined
                      : () =>
                          void settle.mutateAsync({
                            status:
                              movement.status === 'paid' ? 'pending' : 'paid',
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

          {onRegisterMovement ? (
            <AppButton
              title={t('club.cash.addMovement')}
              variant="secondary"
              icon="add"
              fullWidth
              style={styles.modalAction}
              onPress={() => onRegisterMovement(tournamentId)}
            />
          ) : null}

          {error ? (
            <AppText
              variant="caption"
              color={colors.danger}
              style={styles.hint}
            >
              {error}
            </AppText>
          ) : null}
        </ScrollView>
      )}

      {/* Borrar un movimiento mal registrado (solo el admin del club) */}
      <ConfirmModal
        visible={deleteTarget !== null}
        title={t('club.cash.removeMovement')}
        message={t('club.cash.removeMovementMessage')}
        confirmLabel={t('club.cash.removeMovement')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={deleteMovement.isPending}
        onConfirm={() => {
          if (deleteTarget === null) return;
          void deleteMovement.mutateAsync(deleteTarget).then(() => {
            setDeleteTarget(null);
            onNotice?.(t('club.cash.movementDeleted'));
          });
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppModal>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 460 },
  subtitle: { marginBottom: 8 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  hint: { marginBottom: 8 },
  empty: { padding: 16 },
  playerRight: { alignItems: 'flex-end', gap: 4 },
  prizeRow: { marginBottom: 8 },
  prizeLabel: { marginBottom: 4 },
  prizeFields: { flexDirection: 'row', gap: 8 },
  prizeSelect: { flex: 2 },
  prizeAmount: { flex: 1 },
  modalAction: { marginTop: 12 },
});
