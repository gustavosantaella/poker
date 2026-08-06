import { Tournament } from '@/api/types';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { TournamentStatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDateTime, formatNumber } from '@/utils/format';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';

export function TournamentListItem({
  tournament,
  onPress,
}: {
  tournament: Tournament;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <AppCard onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <AppText variant="subtitle" numberOfLines={1}>
            {tournament.name}
          </AppText>
          <AppText variant="caption">
            {tournament.gameType?.name ?? 'No game type'} • {formatDateTime(tournament.startDate)}
          </AppText>
        </View>
        <TournamentStatusBadge status={tournament.status} />
      </View>
      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <AppText variant="caption" color={colors.textSecondary}>
            Buy-in
          </AppText>
          <AppText variant="body" weight="semibold">
            {formatCurrency(tournament.buyIn)}
            {tournament.fee > 0 ? ` + ${formatCurrency(tournament.fee)}` : ''}
          </AppText>
        </View>
        <View style={styles.metaItem}>
          <AppText variant="caption" color={colors.textSecondary}>
            Stack
          </AppText>
          <AppText variant="body" weight="semibold">
            {formatNumber(tournament.startingStack)}
          </AppText>
        </View>
        <View style={styles.metaItem}>
          <AppText variant="caption" color={colors.textSecondary}>
            Players
          </AppText>
          <AppText variant="body" weight="semibold">
            {tournament.maxPlayers}
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