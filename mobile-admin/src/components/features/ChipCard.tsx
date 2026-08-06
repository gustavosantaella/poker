import { Chip } from '@/api/types';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { ChipSwatch } from '@/components/ui/ChipSwatch';
import { useI18n } from '@/i18n/I18nProvider';
import { formatNumber } from '@/utils/format';
import { StyleSheet, View } from 'react-native';

export function ChipCard({ chip, onPress }: { chip: Chip; onPress: () => void }) {
  const { t } = useI18n();
  return (
    <AppCard onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <ChipSwatch hexColor={chip.hexColor} size={34} />
        <AppText variant="number" color={chip.hexColor} numberOfLines={1} adjustsFontSizeToFit>
          {formatNumber(chip.value)}
        </AppText>
      </View>
      <AppText variant="subtitle" numberOfLines={1}>
        {chip.color}
      </AppText>
      <AppText variant="caption">
        {chip.quantity != null ? t('chip.inStock', { count: formatNumber(chip.quantity) }) : t('chip.noStock')}
      </AppText>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { width: 200, gap: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
});