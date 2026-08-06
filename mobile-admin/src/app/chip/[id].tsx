import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { ChipForm } from '@/components/forms/ChipForm';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useChips, useDeleteChip } from '@/hooks/use-queries';
import { useTheme } from '@/theme';

export default function ChipDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chipId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const { data: chips } = useChips();
  const chip = chips?.items.find((c) => c.id === chipId);
  const deleteChip = useDeleteChip();
  const [confirm, setConfirm] = useState(false);

  const handleDelete = async () => {
    await deleteChip.mutateAsync(chipId);
    router.back();
  };

  return (
    <AppScreen>
      <AppHeader
        title="Edit chip"
        subtitle={chip ? `${chip.color} • ${chip.value}` : undefined}
        showBack
        right={
          <Pressable onPress={() => setConfirm(true)} hitSlop={8}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
        }
      />
      <ChipForm chipId={chipId} />
      <ConfirmModal
        visible={confirm}
        title="Delete chip"
        message={`Delete the ${chip?.color ?? ''} chip (${chip?.value ?? ''})? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleteChip.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirm(false)}
      />
    </AppScreen>
  );
}