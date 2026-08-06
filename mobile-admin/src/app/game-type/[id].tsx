import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { GameTypeForm } from '@/components/forms/GameTypeForm';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAllGameTypes, useDeleteGameType } from '@/hooks/use-queries';
import { useTheme } from '@/theme';

export default function GameTypeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gameTypeId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const { data: all } = useAllGameTypes();
  const gameType = all?.items.find((g) => g.id === gameTypeId);
  const deleteGameType = useDeleteGameType();
  const [confirm, setConfirm] = useState(false);

  const handleDelete = async () => {
    await deleteGameType.mutateAsync(gameTypeId);
    router.back();
  };

  return (
    <AppScreen>
      <AppHeader
        title="Edit game type"
        subtitle={gameType?.name}
        showBack
        right={
          <Pressable onPress={() => setConfirm(true)} hitSlop={8}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
        }
      />
      <GameTypeForm gameTypeId={gameTypeId} />
      <ConfirmModal
        visible={confirm}
        title="Delete game type"
        message={`Delete “${gameType?.name ?? 'this game type'}”? Tables using it will keep their data.`}
        confirmLabel="Delete"
        destructive
        loading={deleteGameType.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirm(false)}
      />
    </AppScreen>
  );
}