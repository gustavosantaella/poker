import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { TournamentForm } from '@/components/forms/TournamentForm';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useDeleteTournament, useTournament } from '@/hooks/use-queries';
import { useTheme } from '@/theme';

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tournamentId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const { data: tournament } = useTournament(tournamentId);
  const deleteTournament = useDeleteTournament();
  const [confirm, setConfirm] = useState(false);

  const handleDelete = async () => {
    await deleteTournament.mutateAsync(tournamentId);
    router.back();
  };

  return (
    <AppScreen>
      <AppHeader
        title="Edit tournament"
        subtitle={tournament?.name}
        showBack
        right={
          <Pressable onPress={() => setConfirm(true)} hitSlop={8}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
        }
      />
      <TournamentForm tournamentId={tournamentId} />
      <ConfirmModal
        visible={confirm}
        title="Delete tournament"
        message={`Delete “${tournament?.name ?? 'this tournament'}”? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleteTournament.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirm(false)}
      />
    </AppScreen>
  );
}