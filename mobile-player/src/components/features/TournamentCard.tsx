import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Tournament } from '@/api/types';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { Badge } from '@/components/ui/Badge';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { ReservationState } from '@/utils/reservation';
import { formatCurrency, formatDateTime, formatNumber } from '@/utils/format';

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
  const online = tournament.mode === 'online';
  const modeBg = online ? colors.primary : colors.success;
  const modeFg = colors.onPrimary;

  const button =
    state === 'playing'
      ? { title: t('tournament.playing'), variant: 'success' as const, icon: 'checkmark' as const }
      : state === 'reserved'
        ? { title: t('tournament.reserved'), variant: 'secondary' as const, icon: 'hourglass-outline' as const }
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
          <AppText variant="body" weight="semibold">{formatCurrency(tournament.buyIn)}{tournament.fee > 0 ? ` + ${formatCurrency(tournament.fee)}` : ''}</AppText>
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
            {t('tournament.guaranteed')}: {formatCurrency(tournament.guaranteedPrize)}
          </AppText>
        </View>
      ) : null}

      <AppButton
        title={button.title}
        icon={button.icon}
        variant={button.variant}
        size="sm"
        fullWidth
        disabled={state !== null}
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
  titleWrap: { flex: 1, marginRight: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  meta: { flexDirection: 'row', gap: 12 },
  metaItem: { flex: 1 },
  guaranteed: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, marginTop: 10,
  },
  reserveBtn: { marginTop: 12 },
});