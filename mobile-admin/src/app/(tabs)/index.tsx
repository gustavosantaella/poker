import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
import { useI18n } from '@/i18n/I18nProvider';
import { useDashboardStats, useTables, useTournaments } from '@/hooks/use-queries';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useDashboardStats();
  const { data: tables, refetch: refetchTables } = useTables();
  const { data: tournaments, refetch: refetchTournaments } = useTournaments();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchStats(), refetchTables(), refetchTournaments()]);
    } finally {
      setRefreshing(false);
    }
  };

  const greeting = user ? t('home.hello', { name: user.name.split(' ')[0] }) : t('home.dashboard');
  const recentTables = tables?.items.slice(0, 3) ?? [];
  const recentTournaments = tournaments?.items.slice(0, 3) ?? [];

  return (
    <AppScreen refreshing={refreshing} onRefresh={handleRefresh}>
      <AppHeader title={greeting} subtitle="PokerPros Admin" />

      {statsLoading ? (
        <LoadingView />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={230}
          decelerationRate="fast"
          contentContainerStyle={styles.statsSlider}
        >
          <StatCard label={t('home.openTables')} value={stats?.openTables ?? 0} icon="pulse" tone="success" />
          <StatCard label={t('home.activeTournaments')} value={stats?.activeTournaments ?? 0} icon="trophy" tone="warning" />
          <StatCard label={t('home.totalTables')} value={stats?.tables ?? 0} icon="grid" />
          <StatCard label={t('home.totalTournaments')} value={stats?.tournaments ?? 0} icon="calendar" tone="accent" />
          <StatCard label={t('home.chips')} value={stats?.chips ?? 0} icon="albums" tone="info" />
          <StatCard label={t('home.gameTypes')} value={stats?.gameTypes ?? 0} icon="layers" tone="muted" />
        </ScrollView>
      )}

      <SectionHeader title={t('home.quickActions')} />
      <View style={styles.actions}>
        <AppButton title={t('home.table')} icon="add" size="sm" style={styles.action} onPress={() => router.push('/table/new')} />
        <AppButton
          title={t('home.tournament')}
          icon="add"
          size="sm"
          variant="secondary"
          style={styles.action}
          onPress={() => router.push('/tournament/new')}
        />
        <AppButton
          title={t('home.chip')}
          icon="add"
          size="sm"
          variant="ghost"
          style={styles.action}
          onPress={() => router.push('/chip/new')}
        />
      </View>

      <SectionHeader title={t('home.recentTables')} actionLabel={t('common.seeAll')} onAction={() => router.push('/tables')} />
      {recentTables.length === 0 ? (
        <EmptyState
          icon="grid-outline"
          title={t('home.noTablesYet')}
          subtitle={t('home.createFirstTable')}
          actionLabel={t('home.newTable')}
          onAction={() => router.push('/table/new')}
        />
      ) : (
        recentTables.map((table) => (
          <TableListItem key={table.id} table={table} onPress={() => router.push(`/table/${table.id}`)} />
        ))
      )}

      <SectionHeader
        title={t('home.upcomingTournaments')}
        actionLabel={t('common.seeAll')}
        onAction={() => router.push('/tournaments')}
      />
      {recentTournaments.length === 0 ? (
        <EmptyState
          icon="trophy-outline"
          title={t('home.noTournamentsYet')}
          subtitle={t('home.scheduleFirstTournament')}
          actionLabel={t('home.newTournament')}
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
  statsSlider: { gap: 10, paddingRight: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
});