import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  const { colors, isDark } = useTheme();
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

  // Mini-estadísticas del hero: mesas abiertas/en juego y torneos activos.
  const openTables = (tablesData?.items ?? []).filter((t) => t.status === 'open' || t.status === 'running').length;
  const activeTournaments = (tournamentsData?.items ?? []).filter(
    (t) => t.status === 'registering' || t.status === 'running',
  ).length;

  return (
    <AppScreen refreshing={tablesRefetching || tournamentsRefetching} onRefresh={handleRefresh}>
      <AppHeader title={t('home.hello', { name: greeting })} menu onMenuPress={openSidebar} />

      <LinearGradient
        colors={
          isDark
            ? ['#5C4312', '#8F6A1F', '#E3B341', '#8F6A1F', '#5C4312']
            : ['#D9B25F', '#F1D896', '#E3B341', '#F1D896', '#D9B25F']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View pointerEvents="none" style={styles.heroSuits}>
          {['♠', '♥', '♦', '♣'].map((suit, i) => (
            <AppText
              key={suit}
              variant="caption"
              color={i % 2 === 0 ? 'rgba(30,22,2,0.5)' : 'rgba(198,43,63,0.55)'}
              style={styles.suit}
            >
              {suit}
            </AppText>
          ))}
        </View>

        <View style={styles.chip}>
          <View style={styles.chipRing} />
          <View style={styles.chipInner}>
            <AppText variant="subtitle" weight="bold" color="#F4D889">
              AA
            </AppText>
          </View>
        </View>
        <AppText variant="title" weight="bold" color="#1E1602" style={styles.heroTitle}>
          {t('home.heroTitle')}
        </AppText>
        <AppText variant="caption" color="rgba(30,22,2,0.78)" center style={styles.heroSubtitle}>
          {t('home.heroSubtitle')}
        </AppText>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <AppText variant="number" color="#1E1602">
              {openTables}
            </AppText>
            <AppText variant="caption" color="rgba(30,22,2,0.72)" weight="semibold">
              {t('home.openTables')}
            </AppText>
          </View>
          <View style={[styles.heroDivider, { backgroundColor: 'rgba(30,22,2,0.25)' }]} />
          <View style={styles.heroStat}>
            <AppText variant="number" color="#1E1602">
              {activeTournaments}
            </AppText>
            <AppText variant="caption" color="rgba(30,22,2,0.72)" weight="semibold">
              {t('home.activeTournaments')}
            </AppText>
          </View>
        </View>
      </LinearGradient>

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
    paddingVertical: 26,
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 216, 137, 0.7)',
    overflow: 'hidden',
    // Brillo dorado del hero
    shadowColor: '#E3B341',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  heroSuits: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  suit: { fontSize: 20 },
  chip: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#F4D889',
    backgroundColor: '#1A150A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  chipRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(244, 216, 137, 0.55)',
  },
  chipInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: 'rgba(244, 216, 137, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 2,
  },
  heroSubtitle: {
    opacity: 0.95,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginTop: 12,
  },
  heroStat: { alignItems: 'center', gap: 2 },
  heroDivider: { width: 1, height: 30 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
});