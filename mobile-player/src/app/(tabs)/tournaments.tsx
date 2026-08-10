import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { createTournamentReservation } from '@/api/tournaments';
import { TournamentCard } from '@/components/features/TournamentCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingView } from '@/components/ui/LoadingView';
import { useAuth } from '@/hooks/use-auth';
import { useMyTournamentReservations, useTournaments } from '@/hooks/use-queries';
import { useReserve } from '@/hooks/use-reserve';
import { useI18n } from '@/i18n/I18nProvider';
import { ReservationState, tournamentState } from '@/utils/reservation';

export default function TournamentsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const { data, isLoading, isRefetching, refetch } = useTournaments();
  const { data: myReservations } = useMyTournamentReservations();
  const tournaments = data?.items ?? [];
  const reserve = useReserve((target, userId) => createTournamentReservation(target.id, userId));

  const stateFor = useMemo(() => {
    const rows = myReservations ?? [];
    return (tournamentId: number): ReservationState => {
      const server = tournamentState(rows, tournamentId);
      if (server) return server;
      return reserve.reservedIds.has(tournamentId) ? 'reserved' : null;
    };
  }, [myReservations, reserve.reservedIds]);

  return (
    <AppScreen refreshing={isRefetching} onRefresh={refetch}>
      <AppHeader title={t('tournaments.title')} subtitle={t('tournaments.count', { count: data?.total ?? 0 })} />
      {isLoading ? (
        <LoadingView />
      ) : tournaments.length === 0 ? (
        <EmptyState icon="trophy-outline" title={t('tournaments.empty')} />
      ) : (
        tournaments.map((tournament) => (
          <TournamentCard
            key={tournament.id}
            tournament={tournament}
            state={stateFor(tournament.id)}
            onPress={() => router.push(`/tournament/${tournament.id}`)}
            onReserve={() => reserve.open({ id: tournament.id, name: tournament.name })}
          />
        ))
      )}

      <ConfirmModal
        visible={reserve.target != null}
        title={t('tournament.reserveConfirmTitle')}
        message={t('tournament.reserveConfirm', { name: reserve.target?.name ?? '' })}
        confirmLabel={t('tournament.reserve')}
        cancelLabel={t('common.cancel')}
        loading={reserve.loading}
        error={reserve.modalError}
        onConfirm={() => user && reserve.confirm(user.id)}
        onCancel={reserve.close}
      />
    </AppScreen>
  );
}