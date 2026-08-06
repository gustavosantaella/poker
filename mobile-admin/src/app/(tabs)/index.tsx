import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { StatCard } from '@/components/features/StatCard';
import { TableListItem } from '@/components/features/TableListItem';
import { TournamentListItem } from '@/components/features/TournamentListItem';
import { AppButton } from '@/components/ui/AppButton';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingView } from '@/components/ui/LoadingView';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAuth } from '@/hooks/use-auth';
import { useDashboardStats, useTables, useTournaments } from '@/hooks/use-queries';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: tables } = useTables();
  const { data: tournaments } = useTournaments();

  const greeting = user ? `Hi, ${user.name.split(' ')[0]}` : 'Dashboard';
  const recentTables = tables?.items.slice(0, 3) ?? [];
  const recentTournaments = tournaments?.items.slice(0, 3) ?? [];

  return (
    <AppScreen>
      <AppHeader title={greeting} subtitle="PokeLAP Admin" />

      {statsLoading ? (
        <LoadingView />
      ) : (
        <View style={styles.statsGrid}>
          <StatCard label="Open tables" value={stats?.openTables ?? 0} icon="pulse" tone="success" />
          <StatCard label="Active tournaments" value={stats?.activeTournaments ?? 0} icon="trophy" tone="warning" />
          <StatCard label="Total tables" value={stats?.tables ?? 0} icon="grid" />
          <StatCard label="Total tournaments" value={stats?.tournaments ?? 0} icon="calendar" tone="accent" />
          <StatCard label="Chips" value={stats?.chips ?? 0} icon="albums" tone="info" />
          <StatCard label="Game types" value={stats?.gameTypes ?? 0} icon="layers" tone="muted" />
        </View>
      )}

      <SectionHeader title="Quick actions" />
      <View style={styles.actions}>
        <AppButton title="Table" icon="add" size="sm" style={styles.action} onPress={() => router.push('/table/new')} />
        <AppButton
          title="Tournament"
          icon="add"
          size="sm"
          variant="secondary"
          style={styles.action}
          onPress={() => router.push('/tournament/new')}
        />
        <AppButton
          title="Chip"
          icon="add"
          size="sm"
          variant="ghost"
          style={styles.action}
          onPress={() => router.push('/chip/new')}
        />
      </View>

      <SectionHeader title="Recent tables" actionLabel="See all" onAction={() => router.push('/tables')} />
      {recentTables.length === 0 ? (
        <EmptyState
          icon="grid-outline"
          title="No tables yet"
          subtitle="Create your first cash table"
          actionLabel="New table"
          onAction={() => router.push('/table/new')}
        />
      ) : (
        recentTables.map((table) => (
          <TableListItem key={table.id} table={table} onPress={() => router.push(`/table/${table.id}`)} />
        ))
      )}

      <SectionHeader
        title="Upcoming tournaments"
        actionLabel="See all"
        onAction={() => router.push('/tournaments')}
      />
      {recentTournaments.length === 0 ? (
        <EmptyState
          icon="trophy-outline"
          title="No tournaments yet"
          subtitle="Schedule your first tournament"
          actionLabel="New tournament"
          onAction={() => router.push('/tournament/new')}
        />
      ) : (
        recentTournaments.map((tournament) => (
          <TournamentListItem
            key={tournament.id}
            tournament={tournament}
            onPress={() => router.push(`/tournament/${tournament.id}`)}
          />
        ))
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
});