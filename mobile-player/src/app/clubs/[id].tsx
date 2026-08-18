import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { API_URL } from '@/api/config';
import { AppCard } from '@/components/ui/AppCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingView } from '@/components/ui/LoadingView';
import { useClub, useClubTables, useClubTournaments } from '@/hooks/use-queries';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { formatCurrency, formatDateTime, formatNumber } from '@/utils/format';

const SERVER_BASE = API_URL.replace(/\/api$/, '');
function buildImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${SERVER_BASE}${path}`;
}

/** Detalle de un club: muestra sus mesas y torneos en específico. */
export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clubId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { data: club, isLoading } = useClub(clubId);
  const { data: tablesData } = useClubTables(clubId);
  const { data: tournamentsData } = useClubTournaments(clubId);

  const tables = tablesData?.items ?? [];
  const tournaments = tournamentsData?.items ?? [];

  if (isLoading) {
    return (
      <AppScreen>
        <AppHeader title={t('tabs.clubs')} showBack onBack={() => router.back()} />
        <LoadingView />
      </AppScreen>
    );
  }

  if (!club) {
    return (
      <AppScreen>
        <AppHeader title={t('tabs.clubs')} showBack onBack={() => router.back()} />
        <EmptyState icon="business-outline" title={t('Clubs.empty')} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader title={club.name} subtitle={`#${club.code}`} showBack onBack={() => router.back()} />

      <AppCard style={styles.card}>
        <View style={styles.row}>
          {club.photoUrl ? (
            <Image
              source={{ uri: buildImageUrl(club.photoUrl) }}
              style={[styles.avatar, { backgroundColor: colors.surfaceMuted }]}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="business-outline" size={24} color={colors.primary} />
            </View>
          )}
          <View style={styles.info}>
            {club.address ? (
              <AppText variant="body" numberOfLines={2}>
                {club.address}
              </AppText>
            ) : null}
            {club.phone ? (
              <AppText variant="caption" color={colors.textSecondary}>
                {club.phone}
              </AppText>
            ) : null}
          </View>
        </View>
      </AppCard>

      <AppHeader title={t('club.tables')} />
      {tables.length === 0 ? (
        <AppText variant="caption" center style={styles.empty}>
          {t('club.noTables')}
        </AppText>
      ) : (
        tables.map((table) => (
          <AppCard key={table.id} onPress={() => router.push(`/table/${table.id}`)} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.info}>
                <AppText variant="body" weight="semibold" numberOfLines={1}>
                  {table.name}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {formatNumber(table.smallBlind)}/{formatNumber(table.bigBlind)} •{' '}
                  {formatCurrency(table.minBuyIn, table.currency)} - {formatCurrency(table.maxBuyIn, table.currency)}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </AppCard>
        ))
      )}

      <AppHeader title={t('club.tournaments')} />
      {tournaments.length === 0 ? (
        <AppText variant="caption" center style={styles.empty}>
          {t('club.noTournaments')}
        </AppText>
      ) : (
        tournaments.map((tournament) => (
          <AppCard key={tournament.id} onPress={() => router.push(`/tournament/${tournament.id}`)} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.info}>
                <AppText variant="body" weight="semibold" numberOfLines={1}>
                  {tournament.name}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {formatDateTime(tournament.startDate)} • {formatCurrency(tournament.buyIn, tournament.currency)}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </AppCard>
        ))
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  empty: { marginVertical: 16 },
});
