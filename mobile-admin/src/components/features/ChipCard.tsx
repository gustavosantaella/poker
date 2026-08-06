import { Ionicons } from '@expo/vector-icons';
import { Chip } from '@/api/types';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { ChipSwatch } from '@/components/ui/ChipSwatch';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { formatNumber } from '@/utils/format';
import { StyleSheet, View } from 'react-native';

/** Fila de ficha en formato lista (swatch + nombre + stock + valor). */
export function ChipCard({ chip, onPress }: { chip: Chip; onPress: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <AppCard onPress={onPress} style={styles.card}>
      <ChipSwatch hexColor={chip.hexColor} size={40} />
      <View style={styles.info}>
        <AppText variant="subtitle" numberOfLines={1}>
          {chip.color}
        </AppText>
        <AppText variant="caption">
          {chip.quantity != null ? t('chip.inStock', { count: formatNumber(chip.quantity) }) : t('chip.noStock')}
        </AppText>
      </View>
      <AppText variant="subtitle" color={chip.hexColor} numberOfLines={1} adjustsFontSizeToFit>
        {formatNumber(chip.value)}
      </AppText>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1 },
});