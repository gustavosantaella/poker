import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { TournamentListItem } from '@/components/features/TournamentListItem';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { LoadingView } from '@/components/ui/LoadingView';
import { useTournaments } from '@/hooks/use-queries';

export default function TournamentsScreen() {
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useTournaments();
  const tournaments = data?.items ?? [];

  return (
    <View style={styles.flex}>
      <AppScreen refreshing={isRefetching} onRefresh={refetch}>
        <AppHeader title="Tournaments" subtitle={`${data?.total ?? 0} tournaments`} />

        {isLoading ? (
          <LoadingView />
        ) : tournaments.length === 0 ? (
          <EmptyState
            icon="trophy-outline"
            title="No tournaments"
            subtitle="Schedule a tournament with automatic blind levels"
            actionLabel="New tournament"
            onAction={() => router.push('/tournament/new')}
          />
        ) : (
          tournaments.map((tournament) => (
            <TournamentListItem
              key={tournament.id}
              tournament={tournament}
              onPress={() => router.push(`/tournament/${tournament.id}`)}
            />
          ))
        )}
      </AppScreen>
      <FAB onPress={() => router.push('/tournament/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});