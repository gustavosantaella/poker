import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ChipCard } from '@/components/features/ChipCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { LoadingView } from '@/components/ui/LoadingView';
import { useChips } from '@/hooks/use-queries';

export default function ChipsScreen() {
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useChips();
  const chips = data?.items ?? [];

  return (
    <View style={styles.flex}>
      <AppScreen refreshing={isRefetching} onRefresh={refetch}>
        <AppHeader title="Chips" subtitle={`${data?.total ?? 0} denominations`} />

        {isLoading ? (
          <LoadingView />
        ) : chips.length === 0 ? (
          <EmptyState
            icon="albums-outline"
            title="No chips"
            subtitle="Add chip denominations with their value and color"
            actionLabel="New chip"
            onAction={() => router.push('/chip/new')}
          />
        ) : (
          <View style={styles.grid}>
            {chips.map((chip) => (
              <ChipCard key={chip.id} chip={chip} onPress={() => router.push(`/chip/${chip.id}`)} />
            ))}
          </View>
        )}
      </AppScreen>
      <FAB onPress={() => router.push('/chip/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});