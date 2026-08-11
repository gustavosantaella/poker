import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { LoadingView } from '@/components/ui/LoadingView';
import { useAuth } from '@/hooks/use-auth';
import { useDealerAssignment, useDealerComplete, useDealerStandUp } from '@/hooks/use-queries';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { getErrorMessage } from '@/utils/error';
import { formatNumber } from '@/utils/format';

/** Vista del repartidor en la mesa: asientos, tiempo de pensamiento y acciones. */
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

  const assignment = data?.assignment ?? null;
  const seats = data?.seats ?? [];
  const occupied = seats.filter((s) => s.player);

  const actionTime = assignment?.tournament?.actionTimeSec ?? assignment?.table?.actionTimeSec ?? 30;
  const tableName = assignment?.tournament
    ? `${assignment.tournament.name} • ${t('dealer.tableNumber', { n: assignment.tableNumber ?? 1 })}`
    : (assignment?.table?.name ?? t('dealer.title'));

  // Al cambiar los jugadores (p. ej. al levantar a alguien) reinicia el turno.
  useEffect(() => {
    setTurnIndex(0);
    setRemaining(actionTime);
  }, [occupied.length, actionTime]);

  // Cuenta regresiva por jugador.
  useEffect(() => {
    if (occupied.length === 0) return;
    const timer = setInterval(() => {
      setRemaining((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [occupied.length, actionTime, turnIndex]);

  const nextTurn = useCallback(() => {
    if (occupied.length === 0) return;
    setTurnIndex((i) => (i + 1) % occupied.length);
    setRemaining(actionTime);
  }, [occupied.length, actionTime]);

  // Al llegar el tiempo a 0, pasa automáticamente al siguiente jugador.
  useEffect(() => {
    if (remaining === 0 && occupied.length > 0) {
      nextTurn();
    }
  }, [remaining, occupied.length, nextTurn]);

  if (authLoading || isLoading) return <LoadingView />;
  if (user?.role !== 'dealer') return <Redirect href="/" />;
  if (!assignment) return <Redirect href="/dealer" />;

  const currentSeat = occupied[turnIndex % Math.max(1, occupied.length)];
  const totalSeats = Math.max(seats.length, 1);

  const handleStandUp = async () => {
    const current = currentSeat;
    if (!current?.player) return;
    setError(null);
    try {
      await standUp.mutateAsync(
        assignment.tournamentId != null
          ? { reservationId: current.player.reservationId }
          : { tableReservationId: current.player.reservationId },
      );
      // Tras el refetch, el efecto reinicia el turno al primer jugador restante.
      await refetch();
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
      <AppHeader title={tableName} subtitle={`${t('dealer.players', { n: occupied.length })}`} showBack onBack={() => router.back()} />

      {occupied.length === 0 ? (
        <AppText variant="body" center style={styles.empty}>
          {t('dealer.emptyTable')}
        </AppText>
      ) : (
        <>
          <View style={styles.tableArea}>
            <View style={[styles.tableFelt, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
              <AppText variant="caption" weight="semibold" color={colors.primary}>
                {t('dealer.currentTurn', { name: currentSeat?.player?.name ?? '—' })}
              </AppText>
            </View>
            {seats.map((seat, i) => {
              const angle = (i / totalSeats) * Math.PI * 2 - Math.PI / 2;
              const left = 50 + 40 * Math.cos(angle);
              const top = 50 + 36 * Math.sin(angle);
              const isCurrent = seat.player != null && seat === currentSeat;
              return (
                <View
                  key={`${seat.seat}-${i}`}
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
                  <AppText variant="caption" weight={isCurrent ? 'bold' : 'semibold'} color={isCurrent ? colors.primary : colors.textMuted}>
                    {seat.seat}
                  </AppText>
                  <AppText variant="body" weight={isCurrent ? 'bold' : 'regular'} numberOfLines={1} style={styles.seatName}>
                    {seat.player?.name ?? '—'}
                  </AppText>
                  {isCurrent ? (
                    <AppText variant="caption" weight="bold" color={colors.warning}>
                      {remaining}s
                    </AppText>
                  ) : seat.player ? (
                    <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                      {formatNumber(seat.player.stack ?? 0)}
                    </AppText>
                  ) : null}
                </View>
              );
            })}
          </View>

          <View style={styles.actions}>
            <View style={styles.actionRow}>
              <AppButton title={t('dealer.fold')} variant="danger" style={styles.actionBtn} onPress={nextTurn} />
              <AppButton title={t('dealer.check')} variant="secondary" style={styles.actionBtn} onPress={nextTurn} />
            </View>
            <AppButton
              title={t('dealer.standUpPlayer')}
              icon="person-remove-outline"
              variant="danger"
              fullWidth
              onPress={handleStandUp}
              loading={standUp.isPending}
              style={styles.standUpBtn}
            />
          </View>
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
  empty: { marginVertical: 32 },
  tableArea: { position: 'relative', height: 320, marginBottom: 12 },
  tableFelt: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 210,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    transform: [{ translateX: -105 }, { translateY: -65 }],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  seatChip: {
    position: 'absolute',
    width: 104,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    transform: [{ translateX: -52 }, { translateY: -26 }],
  },
  seatName: { maxWidth: 96 },
  actions: { gap: 8 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1 },
  standUpBtn: { marginTop: 4 },
  finishBtn: { marginTop: 12 },
  error: { marginTop: 8 },
});