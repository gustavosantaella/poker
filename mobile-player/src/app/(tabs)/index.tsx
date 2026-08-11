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
import { useSidebar } from '@/hooks/use-sidebar';
import { useMyTableReservations, useMyTournamentReservations, useTables, useTournaments } from '@/hooks/use-queries';
import { useReserve } from '@/hooks/use-reserve';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { radius } from '@/theme/radius';
import { ReservationState, tableState, tournamentState } from '@/utils/reservation';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { openSidebar } = useSidebar();
  const { data: tablesData, isLoading: tablesLoading, refetch: refetchTables, isRefetching: tablesRefetching } =
    useTables();
  const { data: tournamentsData, refetch: refetchTournaments, isRefetching: tournamentsRefetching } =
    useTournaments();
  const { data: myTableReservations } = useMyTableReservations();
  const { data: myTournamentReservations } = useMyTournamentReservations();
  const tables = (tablesData?.items ?? []).slice(0, 3);
  const tournaments = (tournamentsData?.items ?? []).filter((trn) => trn.status !== 'completed').slice(0, 3);
  const reserveTable = useReserve((target, userId) => createTableReservation(target.id, userId));
  const reserveTournament = useReserve((target, userId) => createTournamentReservation(target.id, userId));

  const stateForTable = useMemo(() => {
    const rows = myTableReservations ?? [];
    return (id: number): ReservationState => {
      const server = tableState(rows, id);
      if (server) return server;
      return reserveTable.reservedIds.has(id) ? 'reserved' : null;
    };
  }, [myTableReservations, reserveTable.reservedIds]);

  const stateForTournament = useMemo(() => {
    const rows = myTournamentReservations ?? [];
    return (id: number): ReservationState => {
      const server = tournamentState(rows, id);
      if (server) return server;
      return reserveTournament.reservedIds.has(id) ? 'reserved' : null;
    };
  }, [myTournamentReservations, reserveTournament.reservedIds]);

  const handleRefresh = async () => {
    await Promise.all([refetchTables(), refetchTournaments()]);
  };

  const greeting = user?.alias ?? user?.name?.split(' ')[0] ?? '';

  return (
    <AppScreen refreshing={tablesRefetching || tournamentsRefetching} onRefresh={handleRefresh}>
      <AppHeader title={t('home.hello', { name: greeting })} menu onMenuPress={openSidebar} />

      <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
        <View style={[styles.chip, { borderColor: colors.primary, backgroundColor: colors.primaryMuted }]}>
          <View style={[styles.chipInner, { borderColor: colors.primary }]}>
            <AppText variant="subtitle" weight="bold" color={colors.primary}>
              AA
            </AppText>
          </View>
        </View>
        <AppText variant="title" color={colors.primary} style={styles.heroTitle}>
          {t('home.heroTitle')}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} style={styles.heroSubtitle}>
          {t('home.heroSubtitle')}
        </AppText>
        <View style={styles.suitsRow}>
          {['♠', '♥', '♦', '♣'].map((suit, i) => (
            <AppText key={suit} variant="caption" color={i % 2 === 0 ? colors.textMuted : colors.danger} style={styles.suit}>
              {suit}
            </AppText>
          ))}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">{t('home.upcomingTournaments')}</AppText>
        <AppButton title={t('home.seeAll')} variant="ghost" size="sm" onPress={() => router.push('/tournaments')} />
      </View>
      {tournaments.map((tournament) => (
        <TournamentCard
          key={tournament.id}
          tournament={tournament}
          state={stateForTournament(tournament.id)}
          onPress={() => router.push(`/tournament/${tournament.id}`)}
          onReserve={() => reserveTournament.open({ id: tournament.id, name: tournament.name })}
        />
      ))}

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
            state={stateForTable(table.id)}
            onPress={() => router.push(`/table/${table.id}`)}
            onReserve={() => reserveTable.open({ id: table.id, name: table.name })}
          />
        ))
      )}

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
    borderRadius: radius.lg,
    padding: 24,
    marginBottom: 16,
    gap: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    // Brillo dorado del hero
    shadowColor: '#E3B341',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  chip: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  chipInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  heroSubtitle: {
    opacity: 0.9,
  },
  suitsRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  suit: { fontSize: 18 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
});