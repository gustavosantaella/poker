import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppModal } from '@/components/ui/AppModal';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { LoadingView } from '@/components/ui/LoadingView';
import { useAuth } from '@/hooks/use-auth';
import { useDealerAssignment, useDealerAssign, useDealerContext } from '@/hooks/use-queries';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { getErrorMessage } from '@/utils/error';

/** Pantalla del repartidor: elige el torneo (y mesa) o mesa cash donde repartir. */
export default function DealerHomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user, isLoading: authLoading } = useAuth();
  const { data: ctx, isLoading } = useDealerContext();
  const { data: active } = useDealerAssignment();
  const assign = useDealerAssign();

  const [targetTournamentId, setTargetTournamentId] = useState<number | null>(null);
  const [targetTableNumber, setTargetTableNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) return <LoadingView />;
  if (user?.role !== 'dealer') return <Redirect href="/" />;

  const club = ctx?.club ?? null;
  const tournaments = ctx?.tournaments ?? [];
  const tables = ctx?.tables ?? [];

  const selectedTournament = tournaments.find((tr) => tr.id === targetTournamentId) ?? null;
  const tableCount = Math.max(1, selectedTournament?.tableCount ?? 1);
  const tableNumberOptions = Array.from({ length: tableCount }, (_, i) => ({
    label: t('dealer.tableNumber', { n: i + 1 }),
    value: String(i + 1),
  }));

  const startTournament = async () => {
    if (!targetTournamentId) return;
    setError(null);
    try {
      await assign.mutateAsync({
        tournamentId: targetTournamentId,
        tableNumber: targetTableNumber ? Number(targetTableNumber) : 1,
      });
      router.push('/dealer/table');
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const startCashTable = async (tableId: number) => {
    setError(null);
    try {
      await assign.mutateAsync({ tableId });
      router.push('/dealer/table');
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <AppScreen>
      <AppHeader title={t('dealer.title')} showBack onBack={() => router.back()} />

      {active?.assignment ? (
        <AppButton
          title={t('dealer.continueActive')}
          icon="play"
          variant="primary"
          fullWidth
          onPress={() => router.push('/dealer/table')}
          style={styles.continueBtn}
        />
      ) : null}

      {isLoading ? (
        <LoadingView />
      ) : (
        <>
          {club ? (
            <AppCard style={styles.clubCard}>
              <AppText variant="body" weight="semibold">{club.name}</AppText>
              <AppText variant="caption" color={colors.textSecondary}>#{club.code}</AppText>
            </AppCard>
          ) : null}

          <AppText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            {t('dealer.selectTournament')}
          </AppText>
          {tournaments.length === 0 ? (
            <AppText variant="caption" center style={styles.empty}>{t('dealer.noTournaments')}</AppText>
          ) : (
            tournaments.map((tournament) => (
              <AppCard key={tournament.id} onPress={() => setTargetTournamentId(tournament.id)} style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.info}>
                    <AppText variant="body" weight="semibold" numberOfLines={1}>{tournament.name}</AppText>
                    <AppText variant="caption" color={colors.textSecondary}>
                      {tournament.tableCount ?? 1} {t('dealer.tablesCount')}
                    </AppText>
                  </View>
                </View>
              </AppCard>
            ))
          )}

          <AppText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            {t('dealer.selectTable')}
          </AppText>
          {tables.length === 0 ? (
            <AppText variant="caption" center style={styles.empty}>{t('dealer.noTables')}</AppText>
          ) : (
            tables.map((table) => (
              <AppCard key={table.id} onPress={() => startCashTable(table.id)} style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.info}>
                    <AppText variant="body" weight="semibold" numberOfLines={1}>{table.name}</AppText>
                    <AppText variant="caption" color={colors.textSecondary}>
                      {table.smallBlind}/{table.bigBlind} • {table.seats} {t('dealer.seats')}
                    </AppText>
                  </View>
                </View>
              </AppCard>
            ))
          )}
        </>
      )}

      <AppModal
        visible={targetTournamentId != null}
        title={selectedTournament?.name ?? t('dealer.title')}
        onClose={() => {
          setTargetTournamentId(null);
          setTargetTableNumber(null);
        }}
      >
        {selectedTournament ? (
          <View>
            {tableCount > 1 ? (
              <>
                <AppText variant="body" weight="semibold" style={styles.tableNumberLabel}>
                  {t('dealer.selectTableNumber')}
                </AppText>
                <View style={styles.tableNumbers}>
                  {tableNumberOptions.map((opt) => {
                    const active = targetTableNumber === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setTargetTableNumber(opt.value)}
                        style={[
                          styles.tableNumberChip,
                          { backgroundColor: active ? colors.primaryMuted : colors.surfaceMuted },
                        ]}
                      >
                        <AppText
                          variant="body"
                          weight={active ? 'semibold' : 'regular'}
                          color={active ? colors.primary : colors.textSecondary}
                        >
                          {opt.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
            {error ? (
              <AppText variant="caption" color={colors.danger} style={styles.error}>{error}</AppText>
            ) : null}
            <AppButton
              title={t('dealer.startDealing')}
              icon="play"
              onPress={startTournament}
              loading={assign.isPending}
              fullWidth
            />
          </View>
        ) : null}
      </AppModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  continueBtn: { marginBottom: 12 },
  clubCard: { marginBottom: 16 },
  sectionTitle: { marginTop: 4, marginBottom: 8 },
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1 },
  empty: { marginVertical: 12 },
  error: { marginBottom: 12 },
  tableNumberLabel: { marginBottom: 8 },
  tableNumbers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tableNumberChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
});