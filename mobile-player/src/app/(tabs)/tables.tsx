import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { createTableReservation } from '@/api/tables';
import { TableCard } from '@/components/features/TableCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingView } from '@/components/ui/LoadingView';
import { useAuth } from '@/hooks/use-auth';
import { useMyTableReservations, useTables } from '@/hooks/use-queries';
import { useReserve } from '@/hooks/use-reserve';
import { useI18n } from '@/i18n/I18nProvider';

export default function TablesScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const { data, isLoading, isRefetching, refetch } = useTables();
  const { data: myReservations } = useMyTableReservations();
  const tables = data?.items ?? [];
  const reserve = useReserve((target, userId) => createTableReservation(target.id, userId));

  const reservedIds = useMemo(() => {
    const set = new Set<number>();
    (myReservations ?? []).forEach((r) => {
      if (r.status !== 'cancelled') set.add(r.tableId);
    });
    reserve.reservedIds.forEach((id) => set.add(id));
    return set;
  }, [myReservations, reserve.reservedIds]);

  return (
    <AppScreen refreshing={isRefetching} onRefresh={refetch}>
      <AppHeader title={t('tables.title')} subtitle={t('tables.count', { count: data?.total ?? 0 })} />
      {isLoading ? (
        <LoadingView />
      ) : tables.length === 0 ? (
        <EmptyState icon="grid-outline" title={t('tables.empty')} />
      ) : (
        tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            reserved={reservedIds.has(table.id)}
            onPress={() => router.push(`/table/${table.id}`)}
            onReserve={() => reserve.open({ id: table.id, name: table.name })}
          />
        ))
      )}

      <ConfirmModal
        visible={reserve.target != null}
        title={t('table.reserveConfirmTitle')}
        message={t('table.reserveConfirm', { name: reserve.target?.name ?? '' })}
        confirmLabel={t('table.reserve')}
        cancelLabel={t('common.cancel')}
        loading={reserve.loading}
        error={reserve.modalError}
        onConfirm={() => user && reserve.confirm(user.id)}
        onCancel={reserve.close}
      />
    </AppScreen>
  );
}