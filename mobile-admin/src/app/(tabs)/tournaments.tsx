import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TournamentStatus } from '@/api/types';
import { TournamentListItem } from '@/components/features/TournamentListItem';
import { AppFilterTab, AppFilterTabs } from '@/components/ui/AppFilterTabs';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { LoadingView } from '@/components/ui/LoadingView';
import { TOURNAMENT_STATUS_VALUES } from '@/constants';
import { TranslationKey } from '@/i18n';
import { useI18n } from '@/i18n/I18nProvider';
import { useTournaments } from '@/hooks/use-queries';
import { useTournamentEvents } from '@/hooks/use-tournament-events';

/** Estado de torneo o 'all' para el filtro sin restriccion. */
type TournamentFilter = TournamentStatus | 'all';

const FILTER_VALUES: TournamentFilter[] = ['all', ...TOURNAMENT_STATUS_VALUES];

/** Etiqueta (en plural) de cada pestana del listado. */
const FILTER_KEYS: Record<TournamentFilter, TranslationKey> = {
  all: 'tournaments.filter.all',
  scheduled: 'tournaments.filter.scheduled',
  registering: 'tournaments.filter.registering',
  running: 'tournaments.filter.running',
  paused: 'tournaments.filter.paused',
  completed: 'tournaments.filter.completed',
  cancelled: 'tournaments.filter.cancelled',
};

export default function TournamentsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [filter, setFilter] = useState<TournamentFilter>('all');
  const { data, isLoading, isRefetching, refetch } = useTournaments();
  const tournaments = data?.items ?? [];
  // Tiempo real: actualiza la lista cuando cambia cualquier torneo (SSE).
  useTournamentEvents();

  // El listado llega completo desde la API, asi que el conteo por estado es local.
  const counts = useMemo(() => {
    const byStatus = { all: tournaments.length } as Record<TournamentFilter, number>;
    for (const status of TOURNAMENT_STATUS_VALUES) {
      byStatus[status] = 0;
    }
    for (const tournament of tournaments) {
      byStatus[tournament.status] += 1;
    }
    return byStatus;
  }, [tournaments]);

  const visible = filter === 'all' ? tournaments : tournaments.filter((item) => item.status === filter);
  const tabs: AppFilterTab<TournamentFilter>[] = FILTER_VALUES.map((value) => ({
    value,
    label: t(FILTER_KEYS[value]),
    count: counts[value],
  }));

  return (
    <View style={styles.flex}>
      <AppScreen refreshing={isRefetching} onRefresh={refetch}>
        <AppHeader
          title={t('tournaments.title')}
          subtitle={t('tournaments.count', {
            count: filter === 'all' ? data?.total ?? 0 : visible.length,
          })}
        />

        {isLoading ? (
          <LoadingView />
        ) : tournaments.length === 0 ? (
          <EmptyState
            icon="trophy-outline"
            title={t('tournaments.emptyTitle')}
            subtitle={t('tournaments.emptySubtitle')}
            actionLabel={t('tournaments.new')}
            onAction={() => router.push('/tournament/new')}
          />
        ) : (
          <>
            <AppFilterTabs value={filter} options={tabs} onChange={setFilter} />
            {visible.length === 0 ? (
              <EmptyState
                icon="funnel-outline"
                title={t('tournaments.emptyFilterTitle')}
                subtitle={t('tournaments.emptyFilterSubtitle')}
              />
            ) : (
              visible.map((tournament) => (
                <TournamentListItem key={tournament.id} tournament={tournament} />
              ))
            )}
          </>
        )}
      </AppScreen>
      <FAB onPress={() => router.push('/tournament/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});