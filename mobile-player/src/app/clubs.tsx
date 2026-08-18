import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { API_URL } from '@/api/config';
import { Club } from '@/api/types';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { AppTextField } from '@/components/ui/AppTextField';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingView } from '@/components/ui/LoadingView';
import { useClubs, useJoinClub, useMyClubMemberships, useMyClubs } from '@/hooks/use-queries';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { getErrorMessage } from '@/utils/error';
import { formatNumber } from '@/utils/format';

const SERVER_BASE = API_URL.replace(/\/api$/, '');
function buildImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${SERVER_BASE}${path}`;
}

type Tab = 'all' | 'mine';

/** Clubs: unirse por código y navegar entre "Todos" y "Mis clubs". */
export default function ClubsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { data, isLoading, isRefetching, refetch } = useClubs();
  const { data: myClubsData } = useMyClubs();
  const { data: membershipsData } = useMyClubMemberships();
  const join = useJoinClub();

  const [tab, setTab] = useState<Tab>('all');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);

  const clubs = data?.items ?? [];
  const myClubs = myClubsData ?? [];
  const shownClubs = tab === 'mine' ? myClubs : clubs;
  const myStatusByClub = new Map((membershipsData ?? []).map((m) => [m.clubId, m.status]));

  const handleJoin = async () => {
    setJoinError(null);
    setJoinSuccess(false);
    if (!/^\d{6}$/.test(joinCode.trim())) {
      setJoinError(t('club.joinCodeInvalid'));
      return;
    }
    try {
      await join.mutateAsync(joinCode.trim());
      setJoinSuccess(true);
      setJoinCode('');
    } catch (e) {
      setJoinError(getErrorMessage(e));
    }
  };

  const openClub = (club: Club) => router.push(`/clubs/${club.id}`);

  return (
    <AppScreen refreshing={isRefetching} onRefresh={refetch}>
      <AppHeader
        title={t('tabs.clubs')}
        subtitle={t('Clubs.count', { count: data?.total ?? 0 })}
        showBack
        onBack={() => router.back()}
      />
      <View style={[styles.joinCard, { backgroundColor: colors.surfaceMuted }]}>
        <AppTextField
          label={t('club.joinTitle')}
          placeholder={t('club.joinPlaceholder')}
          keyboardType="number-pad"
          value={joinCode}
          onChangeText={(value) => {
            setJoinCode(value.replace(/\D/g, '').slice(0, 6));
            setJoinSuccess(false);
          }}
        />
        <AppButton title={t('club.join')} icon="add" onPress={handleJoin} loading={join.isPending} fullWidth />
        {joinError ? (
          <AppText variant="caption" color={colors.danger} style={styles.joinMsg}>
            {joinError}
          </AppText>
        ) : null}
        {joinSuccess ? (
          <AppText variant="caption" color={colors.success} style={styles.joinMsg}>
            {t('club.joinSuccess')}
          </AppText>
        ) : null}
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab('all')}
          style={[styles.tab, tab === 'all' && { backgroundColor: colors.primaryMuted }]}
        >
          <AppText
            variant="body"
            weight={tab === 'all' ? 'semibold' : 'regular'}
            color={tab === 'all' ? colors.primary : colors.textSecondary}
          >
            {t('club.tabsAll')}
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => setTab('mine')}
          style={[styles.tab, tab === 'mine' && { backgroundColor: colors.primaryMuted }]}
        >
          <AppText
            variant="body"
            weight={tab === 'mine' ? 'semibold' : 'regular'}
            color={tab === 'mine' ? colors.primary : colors.textSecondary}
          >
            {t('club.tabsMine')}
          </AppText>
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingView />
      ) : shownClubs.length === 0 ? (
        <EmptyState
          icon="business-outline"
          title={tab === 'mine' ? t('club.noMyClubs') : t('Clubs.empty')}
        />
      ) : (
        shownClubs.map((club) => {
          const status = myStatusByClub.get(club.id);
          return (
            <AppCard key={club.id} onPress={() => openClub(club)} style={styles.card}>
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
                  <AppText variant="body" weight="semibold" numberOfLines={1}>
                    {club.name}
                  </AppText>
                  <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
                    {t('club.code', { code: club.code })}
                    {club.address ? ` • ${club.address}` : ''}
                    {club.phone ? ` • ${club.phone}` : ''}
                  </AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {formatNumber(club.membersCount ?? 0)}{' '}
                    {t('club.members', { count: club.membersCount ?? 0 })} •{' '}
                    {formatNumber(club.tablesCount ?? 0)} {t('club.tables')} •{' '}
                    {formatNumber(club.tournamentsCount ?? 0)} {t('club.tournaments')}
                  </AppText>
                </View>
                {status === 'accepted' ? (
                  <View style={[styles.statusBadge, { backgroundColor: colors.successMuted }]}>
                    <AppText variant="caption" weight="semibold" color={colors.success}>
                      {t('club.member')}
                    </AppText>
                  </View>
                ) : status === 'pending' ? (
                  <View style={[styles.statusBadge, { backgroundColor: colors.warningMuted }]}>
                    <AppText variant="caption" weight="semibold" color={colors.warning}>
                      {t('club.pending')}
                    </AppText>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </AppCard>
          );
        })
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  joinCard: { borderRadius: 12, padding: 12, gap: 8, marginBottom: 12 },
  joinMsg: { marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
});
