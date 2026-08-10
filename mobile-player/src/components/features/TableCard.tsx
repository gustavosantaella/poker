import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { PokerTable } from '@/api/types';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { Badge } from '@/components/ui/Badge';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { formatCurrency } from '@/utils/format';

export function TableCard({
  table,
  onPress,
  onReserve,
  reserved = false,
}: {
  table: PokerTable;
  onPress: () => void;
  onReserve: () => void;
  reserved?: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const online = table.mode === 'online';
  const modeBg = online ? colors.primary : colors.success;
  const modeFg = colors.onPrimary;

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
          <AppText variant="subtitle" numberOfLines={1}>
            {table.name}
          </AppText>
          <AppText variant="caption">{table.gameType?.name ?? t('table.noGameType')}</AppText>
        </View>
        <Badge label={t(`status.${table.status}`)} tone={table.status === 'open' ? 'success' : 'neutral'} />
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <AppText variant="caption" color={colors.textSecondary}>{t('table.blinds')}</AppText>
          <AppText variant="body" weight="semibold">{table.smallBlind}/{table.bigBlind}</AppText>
        </View>
        <View style={styles.metaItem}>
          <AppText variant="caption" color={colors.textSecondary}>{t('table.buyIn')}</AppText>
          <AppText variant="body" weight="semibold">{formatCurrency(table.minBuyIn)} – {formatCurrency(table.maxBuyIn)}</AppText>
        </View>
        <View style={styles.metaItem}>
          <AppText variant="caption" color={colors.textSecondary}>{t('table.seats')}</AppText>
          <AppText variant="body" weight="semibold">{table.seats}</AppText>
        </View>
      </View>

      <AppButton
        title={reserved ? t('table.reserved') : t('table.reserve')}
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
  modeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: -16,
    marginHorizontal: -16,
    marginBottom: 12,
    paddingVertical: 7,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  titleWrap: { flex: 1, marginRight: 8 },
  meta: { flexDirection: 'row', gap: 12 },
  metaItem: { flex: 1 },
  reserveBtn: { marginTop: 12 },
});