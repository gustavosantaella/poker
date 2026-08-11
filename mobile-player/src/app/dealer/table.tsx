import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { BlindStructurePreview } from '@/components/features/BlindStructurePreview';
import { LoadingView } from '@/components/ui/LoadingView';
import { useAuth } from '@/hooks/use-auth';
import { useDealerAssignment, useDealerComplete, useDealerStandUp } from '@/hooks/use-queries';
import { useTournamentCountdown } from '@/hooks/use-tournament-countdown';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { getErrorMessage } from '@/utils/error';
import { summarizeStructure } from '@/utils/blind-structure';
import { BlindBreakItem, BlindLevelItem } from '@/api/types';
import { formatNumber } from '@/utils/format';

/** Vista del repartidor: mesa de poker con jugadores alrededor, turno y acciones. */
export default function DealerTableScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user, isLoading: authLoading } = useAuth();
  const { data, isLoading, refetch } = useDealerAssignment();
  const complete = useDealerComplete();
  const standUp = useDealerStandUp();

  const [turnIndex, setTurnIndex] = useState(0);
  const [remaining, setRemaining] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'table' | 'structure'>('table');

  const assignment = data?.assignment ?? null;
  const seats = data?.seats ?? [];
  const occupied = useMemo(() => seats.filter((s) => s.player), [seats]);
  const totalSeats = assignment?.table?.seats ?? 9; // mesas de torneo: 9 asientos; cash: configurados
  const seatByNumber = useMemo(() => new Map(seats.map((s) => [s.seat, s])), [seats]);
  const actionTime = assignment?.tournament?.actionTimeSec ?? assignment?.table?.actionTimeSec ?? 30;

  const tableName = assignment?.tournament
    ? `${assignment.tournament.name} • ${t('dealer.tableNumber', { n: assignment.tableNumber ?? 1 })}`
    : (assignment?.table?.name ?? t('dealer.title'));

  const tournament = assignment?.tournament ?? null;
  const isTournament = assignment?.tournamentId != null;
  const countdown = useTournamentCountdown(tournament ?? undefined);
  const items = tournament?.blindStructure ?? [];
  const nextLevel: BlindLevelItem | null =
    countdown.currentIndex != null
      ? ((items.slice(countdown.currentIndex + 1).find((i) => i.type === 'level') ?? null) as BlindLevelItem | null)
      : null;
  const nextBreak: BlindBreakItem | null =
    countdown.currentIndex != null
      ? ((items.slice(countdown.currentIndex + 1).find((i) => i.type === 'break') ?? null) as BlindBreakItem | null)
      : null;
  const currentLevelLabel =
    countdown.currentItem?.type === 'break'
      ? t('tournament.currentBreak')
      : countdown.currentItem
        ? t('tournament.levelShort', { level: countdown.currentItem.level })
        : '—';
  const nextLabel = nextLevel
    ? t('dealer.nextLevel', { blinds: `${nextLevel.smallBlind}/${nextLevel.bigBlind}` })
    : nextBreak
      ? t('dealer.nextBreak', { minutes: nextBreak.durationMin })
      : t('dealer.lastLevel');

  // Al cambiar de mesa vuelve a la vista de mesa.
  useEffect(() => {
    setView('table');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment?.id]);

  // Al cargar una nueva mesa (cambio de asignación), sitúa el turno en el primer asiento ocupado.
  useEffect(() => {
    const idx = seats.findIndex((s) => s.player);
    setTurnIndex(idx < 0 ? 0 : idx);
    setRemaining(actionTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment?.id, actionTime]);

  // Siguiente asiento ocupado después de turnIndex (con vuelta a la mesa).
  const nextOccupiedIndex = useCallback(() => {
    if (seats.length === 0) return -1;
    for (let offset = 1; offset <= seats.length; offset++) {
      const idx = (turnIndex + offset) % seats.length;
      if (seats[idx]?.player) return idx;
    }
    return -1;
  }, [seats, turnIndex]);

  const advance = useCallback(() => {
    const next = nextOccupiedIndex();
    if (next >= 0) {
      setTurnIndex(next);
      setRemaining(actionTime);
    }
  }, [nextOccupiedIndex, actionTime]);

  // Cuenta regresiva del jugador en turno.
  useEffect(() => {
    if (occupied.length === 0) return;
    const timer = setInterval(() => {
      setRemaining((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [occupied.length, actionTime, turnIndex]);

  // Al agotarse el tiempo, pasa automáticamente al siguiente jugador.
  useEffect(() => {
    if (remaining === 0 && occupied.length > 0) {
      advance();
    }
  }, [remaining, occupied.length, advance]);

  if (authLoading || isLoading) return <LoadingView />;
  if (user?.role !== 'dealer') return <Redirect href="/" />;
  if (!assignment) return <Redirect href="/dealer" />;

  const currentSeat = seats[turnIndex];
  const current = currentSeat?.player ?? null;
  const positions = Array.from({ length: totalSeats }, (_, i) => i + 1);

  const handleStandUp = async () => {
    const idx = turnIndex;
    const player = current;
    if (!player) return;
    setError(null);
    try {
      await standUp.mutateAsync(
        assignment.tournamentId != null
          ? { reservationId: player.reservationId }
          : { tableReservationId: player.reservationId },
      );
      await refetch();
      // El turno pasa al siguiente jugador después del asiento liberado.
      if (seats.length > 0) {
        for (let offset = 1; offset <= seats.length; offset++) {
          const next = (idx + offset) % seats.length;
          if (seats[next]?.player) {
            setTurnIndex(next);
            setRemaining(actionTime);
            return;
          }
        }
      }
      setTurnIndex(0);
      setRemaining(actionTime);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleFinish = async () => {
    setError(null);
    try {
      await complete.mutateAsync();
      router.replace('/dealer');
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <AppScreen>
      <AppHeader title={tableName} subtitle={t('dealer.players', { n: occupied.length })} showBack onBack={() => router.back()} />

      {isTournament ? (
        <AppCard style={styles.tournamentCard}>
          <View style={styles.tournamentRow}>
            <View style={styles.tournamentCol}>
              <AppText variant="caption" color={colors.textSecondary}>
                {t('dealer.tournamentTimer')}
              </AppText>
              <AppText variant="body" weight="semibold" numberOfLines={1}>
                {currentLevelLabel}
              </AppText>
              <AppText variant="title" weight="bold" color={colors.primary}>
                {countdown.time}
              </AppText>
            </View>
            <View style={styles.tournamentCol}>
              <AppText variant="caption" color={colors.textSecondary}>
                {t('dealer.nextLevel')}
              </AppText>
              <AppText variant="body" weight="semibold" numberOfLines={2}>
                {nextLabel}
              </AppText>
            </View>
          </View>
          <View style={styles.dealerTabs}>
            <Pressable
              onPress={() => setView('table')}
              style={[styles.dealerTab, view === 'table' && { backgroundColor: colors.primaryMuted }]}
            >
              <AppText
                variant="body"
                weight={view === 'table' ? 'semibold' : 'regular'}
                color={view === 'table' ? colors.primary : colors.textSecondary}
              >
                {t('dealer.tabTable')}
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => setView('structure')}
              style={[styles.dealerTab, view === 'structure' && { backgroundColor: colors.primaryMuted }]}
            >
              <AppText
                variant="body"
                weight={view === 'structure' ? 'semibold' : 'regular'}
                color={view === 'structure' ? colors.primary : colors.textSecondary}
              >
                {t('dealer.tabStructure')}
              </AppText>
            </Pressable>
          </View>
        </AppCard>
      ) : null}

      {isTournament && view === 'structure' ? (
        <BlindStructurePreview
          items={items}
          summary={summarizeStructure(items)}
          currentIndex={tournament?.currentLevel}
        />
      ) : (
        <>
      <View style={styles.tableArea}>
        <View style={[styles.tableFelt, { backgroundColor: colors.successMuted, borderColor: colors.success }]}>
          <AppText variant="caption" weight="semibold" color={colors.success}>
            {current ? t('dealer.currentTurn', { name: current.name }) : t('dealer.title')}
          </AppText>
          {current ? (
            <AppText variant="title" weight="bold" color={colors.success} style={styles.timer}>
              {remaining}s
            </AppText>
          ) : null}
        </View>

        {positions.map((pos) => {
          const seat = seatByNumber.get(pos);
          const isCurrent = seat != null && seat === currentSeat;
          const angle = ((pos - 1) / totalSeats) * Math.PI * 2 - Math.PI / 2;
          const left = 50 + 38 * Math.cos(angle);
          const top = 50 + 33 * Math.sin(angle);
          return (
            <View
              key={pos}
              style={[
                styles.seatChip,
                {
                  left: `${left}%`,
                  top: `${top}%`,
                  backgroundColor: colors.surface,
                  borderColor: isCurrent ? colors.primary : colors.border,
                },
              ]}
            >
              {isCurrent ? (
                <View style={[styles.dealerButton, { backgroundColor: colors.primary }]}>
                  <AppText variant="caption" weight="bold" color={colors.onPrimary}>
                    D
                  </AppText>
                </View>
              ) : null}
              <AppText variant="caption" weight={isCurrent ? 'bold' : 'semibold'} color={isCurrent ? colors.primary : colors.textMuted}>
                {pos}
              </AppText>
              <AppText variant="body" weight={isCurrent ? 'bold' : 'regular'} numberOfLines={1} style={styles.seatName}>
                {seat?.player?.name ?? '—'}
              </AppText>
              {seat?.player ? (
                <AppText variant="caption" color={isCurrent ? colors.primary : colors.textMuted} numberOfLines={1}>
                  {formatNumber(seat.player.stack ?? 0)}
                </AppText>
              ) : null}
            </View>
          );
        })}
      </View>

      {occupied.length === 0 ? (
        <AppText variant="body" center style={styles.empty}>
          {t('dealer.emptyTable')}
        </AppText>
      ) : (
        <View style={styles.actions}>
          <View style={styles.actionRow}>
            <AppButton title={t('dealer.fold')} variant="danger" style={styles.actionBtn} onPress={advance} />
            <AppButton title={t('dealer.nextPlayer')} icon="arrow-forward" variant="primary" style={styles.actionBtn} onPress={advance} />
          </View>
          <AppButton
            title={t('dealer.standUpPlayer')}
            icon="person-remove-outline"
            variant="secondary"
            fullWidth
            onPress={handleStandUp}
            loading={standUp.isPending}
            style={styles.standUpBtn}
          />
        </View>
      )}
        </>
      )}

      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <AppButton
        title={t('dealer.finish')}
        icon="checkmark-done"
        variant="secondary"
        fullWidth
        onPress={handleFinish}
        loading={complete.isPending}
        style={styles.finishBtn}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  tournamentCard: { marginBottom: 12 },
  tournamentRow: { flexDirection: 'row', gap: 12 },
  tournamentCol: { flex: 1 },
  dealerTabs: { flexDirection: 'row', gap: 8, marginTop: 12 },
  dealerTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  tableArea: { position: 'relative', height: 360, marginBottom: 12 },
  tableFelt: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 240,
    height: 150,
    borderRadius: 75,
    borderWidth: 8,
    transform: [{ translateX: -120 }, { translateY: -75 }],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  timer: { marginTop: 2 },
  seatChip: {
    position: 'absolute',
    width: 108,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    transform: [{ translateX: -54 }, { translateY: -27 }],
  },
  seatName: { maxWidth: 96 },
  dealerButton: {
    position: 'absolute',
    top: -9,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { marginVertical: 16 },
  actions: { gap: 8 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1 },
  standUpBtn: { marginTop: 4 },
  finishBtn: { marginTop: 12 },
  error: { marginTop: 8 },
});