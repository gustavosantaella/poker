import { PokerTable } from '@/api/types';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { TableStatusBadge } from '@/components/ui/StatusBadge';
import { useI18n } from '@/i18n/I18nProvider';
import { formatCurrency } from '@/utils/format';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';

export function TableListItem({ table, onPress }: { table: PokerTable; onPress: () => void }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <AppCard onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <AppText variant="subtitle" numberOfLines={1}>
            {table.name}
          </AppText>
          <AppText variant="caption">
            {table.gameType?.name ?? t('table.noGameType')} •{' '}
            {table.mode === 'online' ? t('mode.online') : t('mode.live')}
          </AppText>
        </View>
        <TableStatusBadge status={table.status} />
      </View>
      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('table.blinds')}
          </AppText>
          <AppText variant="body" weight="semibold">
            {table.smallBlind}/{table.bigBlind}
          </AppText>
        </View>
        <View style={styles.metaItem}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('table.buyIn')}
          </AppText>
          <AppText variant="body" weight="semibold">
            {formatCurrency(table.minBuyIn)} – {formatCurrency(table.maxBuyIn)}
          </AppText>
        </View>
        <View style={styles.metaItem}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('table.seats')}
          </AppText>
          <AppText variant="body" weight="semibold">
            {table.seats}
          </AppText>
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  titleWrap: { flex: 1, marginRight: 8 },
  meta: { flexDirection: 'row', gap: 12 },
  metaItem: { flex: 1 },
});