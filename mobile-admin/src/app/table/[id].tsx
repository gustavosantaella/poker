import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { TableForm } from '@/components/forms/TableForm';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingView } from '@/components/ui/LoadingView';
import { useDeleteTable, useTable } from '@/hooks/use-queries';
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
        <AppText variant="caption" color={colors.danger} style={{ marginBottom: 8 }}>
          {error}
        </AppText>
      ) : null}
      <TableForm tableId={tableId} />
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