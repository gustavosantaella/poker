import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Image } from 'react-native';
import { Tournament } from '@/api/types';
import { API_URL } from '@/api/config';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { Badge } from '@/components/ui/Badge';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { ReservationState, canReserveTournament } from '@/utils/reservation';
import { formatCurrency, formatDateTime, formatNumber } from '@/utils/format';
import { useAdminProfile } from '@/hooks/use-queries';

const SERVER_BASE = API_URL.replace(/\/api$/, '');
function buildAvatarUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${SERVER_BASE}${path}`;
}

export function TournamentCard({
  tournament,
  onPress,
  onReserve,
  state = null,
}: {
  tournament: Tournament;
  onPress: () => void;
  onReserve: () => void;
  state?: ReservationState;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { data: admin } = useAdminProfile();
  
  const online = tournament.mode === 'online';
  const modeBg = online ? colors.primary : colors.success;
  const modeFg = colors.onPrimary;
  const closed = state === null && !canReserveTournament(tournament);

  const button =
    state === 'playing'
      ? { title: t('tournament.playing'), variant: 'success' as const, icon: 'checkmark' as const }
      : state === 'reserved'
        ? { title: t('tournament.reserved'), variant: 'secondary' as const, icon: 'hourglass-outline' as const }
        : closed
          ? { title: t('tournament.registrationClosed'), variant: 'secondary' as const, icon: 'lock-closed' as const }
          : { title: t('tournament.reserve'), variant: 'primary' as const, icon: 'add' as const };

  return (
    <AppCard onPress={onPress} style={styles.card}>
      <View style={[styles.modeBar, { backgroundColor: modeBg }]}>
        <Ionicons name={online ? 'globe-outline' : 'location-outline'} size={13} color={modeFg} />
        <AppText variant="caption" weight="semibold" color={modeFg}>
          {online ? t('mode.online') : t('mode.live')}
        </AppText>
      </View>

      <View style={styles.header}>
        {admin?.photoUrl ? (
          <Image source={{ uri: buildAvatarUrl(admin?.photoUrl) }} style={styles.adminAvatar} />
        ) : null}
        <View style={styles.titleWrap}>
          <AppText variant="subtitle" numberOfLines={1}>{tournament.name}</AppText>
          <AppText variant="caption">{tournament.gameType?.name ?? t('table.noGameType')}</AppText>
        </View>
        <Badge label={t(`status.${tournament.status}`)} tone={tournament.status === 'registering' ? 'primary' : 'neutral'} />
      </View>

      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={15} color={colors.primary} />
        <AppText variant="body" weight="semibold" color={colors.primary}>{formatDateTime(tournament.startDate)}</AppText>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <AppText variant="caption" color={colors.textSecondary}>{t('tournament.buyIn')}</AppText>
          <AppText variant="body" weight="semibold">{formatCurrency(tournament.buyIn, tournament.currency)}{tournament.fee > 0 ? ` + ${formatCurrency(tournament.fee, tournament.currency)}` : ''}</AppText>
        </View>
        <View style={styles.metaItem}>
          <AppText variant="caption" color={colors.textSecondary}>{t('tournament.stack')}</AppText>
          <AppText variant="body" weight="semibold">{formatNumber(tournament.startingStack)}</AppText>
        </View>
        <View style={styles.metaItem}>
          <AppText variant="caption" color={colors.textSecondary}>{t('tournament.players')}</AppText>
          <AppText variant="body" weight="semibold">{tournament.maxPlayers == null ? t('tournament.unlimited') : formatNumber(tournament.maxPlayers)}</AppText>
        </View>
      </View>

      {tournament.guaranteedPrize != null ? (
        <View style={[styles.guaranteed, { backgroundColor: colors.warningMuted }]}>
          <Ionicons name="trophy" size={15} color={colors.warning} />
          <AppText variant="body" weight="bold" color={colors.warning}>
            {t('tournament.guaranteed')}: {formatCurrency(tournament.guaranteedPrize, tournament.currency)}
          </AppText>
        </View>
      ) : null}

      <AppButton
        title={button.title}
        icon={button.icon}
        variant={button.variant}
        size="sm"
        fullWidth
        disabled={state !== null || closed}
        onPress={onReserve}
        style={styles.reserveBtn}
      />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  modeBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: -16, marginHorizontal: -16, marginBottom: 12, paddingVertical: 7,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  adminAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#333' },
  titleWrap: { flex: 1, marginRight: 8, justifyContent: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  meta: { flexDirection: 'row', gap: 12 },
  metaItem: { flex: 1 },
  guaranteed: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, marginTop: 10,
  },
  reserveBtn: { marginTop: 12 },
});