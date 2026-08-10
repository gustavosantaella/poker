import { StyleSheet, View } from 'react-native';
import { Tournament } from '@/api/types';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { Badge } from '@/components/ui/Badge';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { formatCurrency, formatDateTime, formatNumber } from '@/utils/format';

export function TournamentCard({
  tournament,
  onPress,
  onReserve,
  reserved = false,
}: {
  tournament: Tournament;
  onPress: () => void;
  onReserve: () => void;
  reserved?: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <AppCard onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <AppText variant="subtitle" numberOfLines={1}>
            {tournament.name}
          </AppText>
          <AppText variant="caption">
            {formatDateTime(tournament.startDate)} •{' '}
            {tournament.mode === 'online' ? t('mode.online') : t('mode.live')}
          </AppText>
        </View>
        <Badge label={t(`status.${tournament.status}`)} tone={tournament.status === 'registering' ? 'primary' : 'neutral'} />
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('tournament.buyIn')}
          </AppText>
          <AppText variant="body" weight="semibold">
            {formatCurrency(tournament.buyIn)}
            {tournament.fee > 0 ? ` + ${formatCurrency(tournament.fee)}` : ''}
          </AppText>
        </View>
        <View style={styles.metaItem}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('tournament.stack')}
          </AppText>
          <AppText variant="body" weight="semibold">
            {formatNumber(tournament.startingStack)}
          </AppText>
        </View>
        <View style={styles.metaItem}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('tournament.players')}
          </AppText>
          <AppText variant="body" weight="semibold">
            {tournament.maxPlayers == null ? t('tournament.unlimited') : formatNumber(tournament.maxPlayers)}
          </AppText>
        </View>
      </View>

      <AppButton
        title={reserved ? t('tournament.reserved') : t('tournament.reserve')}
        icon={reserved ? 'checkmark' : 'add'}
        variant={reserved ? 'success' : 'primary'}
        size="sm"
        fullWidth
        disabled={reserved}
        onPress={onReserve}
        style={styles.reserveBtn}
      />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  titleWrap: { flex: 1, marginRight: 8 },
  meta: { flexDirection: 'row', gap: 12 },
  metaItem: { flex: 1 },
  reserveBtn: { marginTop: 12 },
});
