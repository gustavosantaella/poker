import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { TableForm } from '@/components/forms/TableForm';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useDeleteTable, useTable } from '@/hooks/use-queries';
import { useTheme } from '@/theme';

export default function TableDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tableId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
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
        title="Edit table"
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
        title="Delete table"
        message={`Delete “${table?.name ?? 'this table'}”? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleteTable.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirm(false)}
      />
    </AppScreen>
  );
}