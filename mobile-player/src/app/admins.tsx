import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { API_URL } from '@/api/config';
import { AppCard } from '@/components/ui/AppCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingView } from '@/components/ui/LoadingView';
import { useAdmins } from '@/hooks/use-queries';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';

const SERVER_BASE = API_URL.replace(/\/api$/, '');
function buildAvatarUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${SERVER_BASE}${path}`;
}

/** Módulo del staff: lista todos los usuarios admin con su foto. */
export default function AdminsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { data, isLoading, isRefetching, refetch } = useAdmins();
  const admins = data?.items ?? [];

  return (
    <AppScreen refreshing={isRefetching} onRefresh={refetch}>
      <AppHeader
        title={t('tabs.admins')}
        subtitle={t('admins.count', { count: data?.total ?? 0 })}
        showBack
        onBack={() => router.back()}
      />
      {isLoading ? (
        <LoadingView />
      ) : admins.length === 0 ? (
        <EmptyState icon="people-outline" title={t('admins.empty')} />
      ) : (
        admins.map((admin) => (
          <AppCard key={admin.id} style={styles.card}>
            <View style={styles.row}>
              {admin.photoUrl ? (
                <Image
                  source={{ uri: buildAvatarUrl(admin.photoUrl) }}
                  style={[styles.avatar, { backgroundColor: colors.surfaceMuted }]}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primaryMuted }]}>
                  <Ionicons name="person" size={26} color={colors.primary} />
                </View>
              )}
              <View style={styles.info}>
                <AppText variant="body" weight="semibold" numberOfLines={1}>
                  {admin.name}
                </AppText>
                {admin.alias ? (
                  <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
                    @{admin.alias}
                  </AppText>
                ) : null}
              </View>
              <View style={[styles.aaBadge, { borderColor: colors.primary, backgroundColor: colors.primaryMuted }]}>
                <AppText variant="caption" weight="semibold" color={colors.primary}>
                  AA
                </AppText>
              </View>
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
  aaBadge: {
    width: 34,
    height: 34,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
