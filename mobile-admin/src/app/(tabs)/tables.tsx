import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { TableListItem } from '@/components/features/TableListItem';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { LoadingView } from '@/components/ui/LoadingView';
import { useTables } from '@/hooks/use-queries';

export default function TablesScreen() {
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useTables();
  const tables = data?.items ?? [];

  return (
    <View style={styles.flex}>
      <AppScreen refreshing={isRefetching} onRefresh={refetch}>
        <AppHeader title="Cash tables" subtitle={`${data?.total ?? 0} tables`} />

        {isLoading ? (
          <LoadingView />
        ) : tables.length === 0 ? (
          <EmptyState
            icon="grid-outline"
            title="No cash tables"
            subtitle="Create a table to start tracking cash games"
            actionLabel="New table"
            onAction={() => router.push('/table/new')}
          />
        ) : (
          tables.map((table) => (
            <TableListItem key={table.id} table={table} onPress={() => router.push(`/table/${table.id}`)} />
          ))
        )}
      </AppScreen>
      <FAB onPress={() => router.push('/table/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});