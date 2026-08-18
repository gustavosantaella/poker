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
import { useAdminProfile, useClub } from '@/hooks/use-queries';

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
  const { data: club } = useClub(tournament.clubId ?? 0);

  // Si el torneo pertenece a un club, se muestra la imagen del club (no la del admin).
  const avatarUrl = tournament.clubId
    ? club?.photoUrl
      ? buildAvatarUrl(club.photoUrl)
      : undefined
    : admin?.photoUrl
      ? buildAvatarUrl(admin.photoUrl)
      : undefined;
  
  const online = tournament.mode === 'online';
  const isGoldCard = tournament.status === 'running';
  const titleColor = isGoldCard ? '#1E1602' : undefined;
  const subtextColor = isGoldCard ? 'rgba(30, 22, 2, 0.76)' : colors.textSecondary;
  const bodyTextColor = isGoldCard ? '#1E1602' : undefined;
  const dateColor = isGoldCard ? '#1E1602' : colors.primary;
  const guaranteedBg = isGoldCard ? 'rgba(0, 0, 0, 0.08)' : colors.warningMuted;
  const guaranteedText = isGoldCard ? '#1E1602' : colors.warning;
  const modeBg = isGoldCard ? 'rgba(0, 0, 0, 0.12)' : (online ? colors.primary : colors.success);
  const modeFg = isGoldCard ? '#1E1602' : colors.onPrimary;
  const closed = state === null && !canReserveTournament(tournament);

  // Tono del badge según el estado del torneo (dorado invertido sobre la tarjeta dorada).
  const statusTone =
    tournament.status === 'running'
      ? 'gold'
      : tournament.status === 'registering' || tournament.status === 'paused'
        ? 'warning'
        : tournament.status === 'cancelled'
          ? 'danger'
          : 'neutral';

  const button =
    state === 'playing'
      ? { title: t('tournament.playing'), variant: 'success' as const, icon: 'checkmark' as const }
      : state === 'reserved'
        ? { title: t('tournament.reserved'), variant: 'secondary' as const, icon: 'hourglass-outline' as const }
        : closed
          ? { title: t('tournament.registrationClosed'), variant: 'secondary' as const, icon: 'lock-closed' as const }
          : { title: t('tournament.reserve'), variant: 'primary' as const, icon: 'add' as const };

  return (
    <AppCard onPress={onPress} style={styles.card} variant={isGoldCard ? 'gold' : 'metallic'}>
      <View style={[styles.modeBar, { backgroundColor: modeBg }]}>
        <Ionicons name={online ? 'globe-outline' : 'location-outline'} size={13} color={modeFg} />
        <AppText variant="caption" weight="semibold" color={modeFg}>
          {online ? t('mode.online') : t('mode.live')}
        </AppText>
      </View>

      <View style={styles.header}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.adminAvatar} />
        ) : null}
        <View style={styles.titleWrap}>
          <AppText variant="subtitle" numberOfLines={1} style={titleColor ? { color: titleColor } : undefined}>{tournament.name}</AppText>
          <AppText variant="caption" style={{ color: subtextColor }}>{tournament.gameType?.name ?? t('table.noGameType')}</AppText>
        </View>
        <Badge
          label={t(`status.${tournament.status}`)}
          tone={statusTone}
        />
      </View>

      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={15} color={dateColor} />
        <AppText variant="body" weight="semibold" color={dateColor}>{formatDateTime(tournament.startDate)}</AppText>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <AppText variant="caption" style={{ color: subtextColor }}>{t('tournament.buyIn')}</AppText>
          <AppText variant="body" weight="semibold" style={bodyTextColor ? { color: bodyTextColor } : undefined}>{formatCurrency(tournament.buyIn, tournament.currency)}{tournament.fee > 0 ? ` + ${formatCurrency(tournament.fee, tournament.currency)}` : ''}</AppText>
        </View>
        <View style={styles.metaItem}>
          <AppText variant="caption" style={{ color: subtextColor }}>{t('tournament.stack')}</AppText>
          <AppText variant="body" weight="semibold" style={bodyTextColor ? { color: bodyTextColor } : undefined}>{formatNumber(tournament.startingStack)}</AppText>
        </View>
        <View style={styles.metaItem}>
          <AppText variant="caption" style={{ color: subtextColor }}>{t('tournament.players')}</AppText>
          <AppText variant="body" weight="semibold" style={bodyTextColor ? { color: bodyTextColor } : undefined}>{tournament.maxPlayers == null ? t('tournament.unlimited') : formatNumber(tournament.maxPlayers)}</AppText>
        </View>
      </View>

      {tournament.guaranteedPrize != null ? (
        <View style={[styles.guaranteed, { backgroundColor: guaranteedBg }]}>
          <Ionicons name="trophy" size={15} color={guaranteedText} />
          <AppText variant="body" weight="bold" color={guaranteedText}>
            {t('tournament.guaranteed')}: {formatCurrency(tournament.guaranteedPrize, tournament.currency)}
          </AppText>
        </View>
      ) : null}

      <AppButton
        title={button.title}
        icon={button.icon}
        variant={isGoldCard ? 'primary' : button.variant}
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