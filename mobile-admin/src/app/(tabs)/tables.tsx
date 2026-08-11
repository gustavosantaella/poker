import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { TableListItem } from '@/components/features/TableListItem';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { LoadingView } from '@/components/ui/LoadingView';
import { useI18n } from '@/i18n/I18nProvider';
import { useTables } from '@/hooks/use-queries';

export default function TablesScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { data, isLoading, isRefetching, refetch } = useTables();
  const tables = data?.items ?? [];

  return (
    <View style={styles.flex}>
      <AppScreen refreshing={isRefetching} onRefresh={refetch}>
        <AppHeader title={t('tables.title')} subtitle={t('tables.count', { count: data?.total ?? 0 })} showMenu />

        {isLoading ? (
          <LoadingView />
        ) : tables.length === 0 ? (
          <EmptyState
            icon="grid-outline"
            title={t('tables.emptyTitle')}
            subtitle={t('tables.emptySubtitle')}
            actionLabel={t('tables.new')}
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