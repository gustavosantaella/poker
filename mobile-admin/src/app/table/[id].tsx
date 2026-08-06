import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { TableForm } from '@/components/forms/TableForm';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useDeleteTable, useTable } from '@/hooks/use-queries';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';

export default function TableDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tableId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { data: table } = useTable(tableId);
  const deleteTable = useDeleteTable();
  const [confirm, setConfirm] = useState(false);

  const handleDelete = async () => {
    await deleteTable.mutateAsync(tableId);
    router.back();
  };

  return (
    <AppScreen>
      <AppHeader
        title={t('table.edit')}
        subtitle={table?.name}
        showBack
        right={
          <Pressable onPress={() => setConfirm(true)} hitSlop={8}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
        }
      />
      <TableForm tableId={tableId} />
      <ConfirmModal
        visible={confirm}
        title={t('table.deleteTitle')}
        message={t('table.deleteMessage', { name: table?.name ?? t('table.new') })}
        confirmLabel={t('common.delete')}
        destructive
        loading={deleteTable.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirm(false)}
      />
    </AppScreen>
  );
}