import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ChipCard } from '@/components/features/ChipCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { LoadingView } from '@/components/ui/LoadingView';
import { useI18n } from '@/i18n/I18nProvider';
import { useChips } from '@/hooks/use-queries';

export default function ChipsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { data, isLoading, isRefetching, refetch } = useChips();
  const chips = data?.items ?? [];

  return (
    <View style={styles.flex}>
      <AppScreen refreshing={isRefetching} onRefresh={refetch}>
        <AppHeader title={t('chips.title')} subtitle={t('chips.count', { count: data?.total ?? 0 })} />

        {isLoading ? (
          <LoadingView />
        ) : chips.length === 0 ? (
          <EmptyState
            icon="albums-outline"
            title={t('chips.emptyTitle')}
            subtitle={t('chips.emptySubtitle')}
            actionLabel={t('chips.new')}
            onAction={() => router.push('/chip/new')}
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={210}
            decelerationRate="fast"
            contentContainerStyle={styles.grid}
          >
            {chips.map((chip) => (
              <ChipCard key={chip.id} chip={chip} onPress={() => router.push(`/chip/${chip.id}`)} />
            ))}
          </ScrollView>
        )}
      </AppScreen>
      <FAB onPress={() => router.push('/chip/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grid: { gap: 10, paddingRight: 8 },
});