import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { createTableReservation } from '@/api/tables';
import { createTournamentReservation } from '@/api/tournaments';
import { TableCard } from '@/components/features/TableCard';
import { TournamentCard } from '@/components/features/TournamentCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { LoadingView } from '@/components/ui/LoadingView';
import { useAuth } from '@/hooks/use-auth';
import { useMyTableReservations, useMyTournamentReservations, useTables, useTournaments } from '@/hooks/use-queries';
import { useReserve } from '@/hooks/use-reserve';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { data: tablesData, isLoading: tablesLoading, refetch: refetchTables, isRefetching: tablesRefetching } =
    useTables();
  const { data: tournamentsData, refetch: refetchTournaments, isRefetching: tournamentsRefetching } =
    useTournaments();
  const { data: myTableReservations } = useMyTableReservations();
  const { data: myTournamentReservations } = useMyTournamentReservations();
  const tables = (tablesData?.items ?? []).slice(0, 3);
  const tournaments = (tournamentsData?.items ?? []).slice(0, 3);
  const reserveTable = useReserve((target, userId) => createTableReservation(target.id, userId));
  const reserveTournament = useReserve((target, userId) => createTournamentReservation(target.id, userId));

  const tableReservedIds = useMemo(() => {
    const set = new Set<number>();
    (myTableReservations ?? []).forEach((r) => {
      if (r.status !== 'cancelled') set.add(r.tableId);
    });
    reserveTable.reservedIds.forEach((id) => set.add(id));
    return set;
  }, [myTableReservations, reserveTable.reservedIds]);

  const tournamentReservedIds = useMemo(() => {
    const set = new Set<number>();
    (myTournamentReservations ?? []).forEach((r) => set.add(r.tournamentId));
    reserveTournament.reservedIds.forEach((id) => set.add(id));
    return set;
  }, [myTournamentReservations, reserveTournament.reservedIds]);

  const handleRefresh = async () => {
    await Promise.all([refetchTables(), refetchTournaments()]);
  };

  const greeting = user?.alias ?? user?.name?.split(' ')[0] ?? '';

  return (
    <AppScreen refreshing={tablesRefetching || tournamentsRefetching} onRefresh={handleRefresh}>
      <AppHeader title={t('home.hello', { name: greeting })} />

      <View style={[styles.hero, { backgroundColor: colors.primaryMuted }]}>
        <AppText variant="title" color={colors.primary}>{t('home.heroTitle')}</AppText>
        <AppText variant="caption" color={colors.primary}>{t('home.heroSubtitle')}</AppText>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">{t('home.availableTables')}</AppText>
        <AppButton title={t('home.seeAll')} variant="ghost" size="sm" onPress={() => router.push('/tables')} />
      </View>
      {tablesLoading ? (
        <LoadingView />
      ) : (
        tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            reserved={tableReservedIds.has(table.id)}
            onPress={() => router.push(`/table/${table.id}`)}
            onReserve={() => reserveTable.open({ id: table.id, name: table.name })}
          />
        ))
      )}

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">{t('home.upcomingTournaments')}</AppText>
        <AppButton title={t('home.seeAll')} variant="ghost" size="sm" onPress={() => router.push('/tournaments')} />
      </View>
      {tournaments.map((tournament) => (
        <TournamentCard
          key={tournament.id}
          tournament={tournament}
          reserved={tournamentReservedIds.has(tournament.id)}
          onPress={() => router.push(`/tournament/${tournament.id}`)}
          onReserve={() => reserveTournament.open({ id: tournament.id, name: tournament.name })}
        />
      ))}

      <ConfirmModal
        visible={reserveTable.target != null}
        title={t('table.reserveConfirmTitle')}
        message={t('table.reserveConfirm', { name: reserveTable.target?.name ?? '' })}
        confirmLabel={t('table.reserve')}
        cancelLabel={t('common.cancel')}
        loading={reserveTable.loading}
        error={reserveTable.modalError}
        onConfirm={() => user && reserveTable.confirm(user.id)}
        onCancel={reserveTable.close}
      />
      <ConfirmModal
        visible={reserveTournament.target != null}
        title={t('tournament.reserveConfirmTitle')}
        message={t('tournament.reserveConfirm', { name: reserveTournament.target?.name ?? '' })}
        confirmLabel={t('tournament.reserve')}
        cancelLabel={t('common.cancel')}
        loading={reserveTournament.loading}
        error={reserveTournament.modalError}
        onConfirm={() => user && reserveTournament.confirm(user.id)}
        onCancel={reserveTournament.close}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    gap: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
});