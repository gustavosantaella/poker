import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TableForm } from '@/components/forms/TableForm';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListItem } from '@/components/ui/ListItem';
import { LoadingView } from '@/components/ui/LoadingView';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useDeleteTable, useRemoveTableReservation, useTable, useTableReservations } from '@/hooks/use-queries';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { getErrorMessage } from '@/utils/error';

export default function TableDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tableId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { data: table, isLoading, isError } = useTable(tableId);
  const deleteTable = useDeleteTable();
  const { data: reservations, isLoading: reservationsLoading } = useTableReservations(tableId);
  const removeReservation = useRemoveTableReservation(tableId);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteTable.mutateAsync(tableId);
      router.back();
    } catch (e) {
      setError(getErrorMessage(e));
      setConfirm(false);
    }
  };

  const statusLabel = (status: string) =>
    status === 'confirmed'
      ? t('table.reservationConfirmed')
      : status === 'cancelled'
        ? t('table.reservationCancelled')
        : t('table.reservationPending');

  if (isLoading) {
    return (
      <AppScreen>
        <AppHeader title={t('table.edit')} showBack />
        <LoadingView label={t('table.loading')} />
      </AppScreen>
    );
  }

  if (isError || !table) {
    return (
      <AppScreen>
        <AppHeader title={t('table.edit')} showBack />
        <EmptyState
          icon="grid-outline"
          title={t('table.notFoundTitle')}
          subtitle={t('table.notFoundMessage')}
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader
        title={t('table.edit')}
        subtitle={table.name}
        showBack
        right={
          <Pressable onPress={() => setConfirm(true)} hitSlop={8}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
        }
      />
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}
      <TableForm tableId={tableId} />

      <SectionHeader title={t('table.reservations')} />
      <AppCard padded={false}>
        {reservationsLoading ? (
          <LoadingView />
        ) : (reservations ?? []).length === 0 ? (
          <View style={styles.emptyWrap}>
            <AppText variant="caption" center>
              {t('table.noReservations')}
            </AppText>
          </View>
        ) : (
          (reservations ?? []).map((r) => (
            <ListItem
              key={r.id}
              title={r.user?.name ?? `#${r.userId}`}
              subtitle={`${r.user?.email ?? ''} • ${statusLabel(r.status)}`}
              icon="person"
              right={
                <AppButton
                  title=""
                  size="sm"
                  variant="ghost"
                  icon="trash-outline"
                  onPress={() => removeReservation.mutateAsync(r.id)}
                />
              }
            />
          ))
        )}
      </AppCard>

      <ConfirmModal
        visible={confirm}
        title={t('table.deleteTitle')}
        message={t('table.deleteMessage', { name: table.name })}
        confirmLabel={t('common.delete')}
        destructive
        loading={deleteTable.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirm(false)}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  error: { marginBottom: 8 },
  emptyWrap: { padding: 16 },
});