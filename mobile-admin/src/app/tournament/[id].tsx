import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { TournamentForm } from '@/components/forms/TournamentForm';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingView } from '@/components/ui/LoadingView';
import { useDeleteTournament, useTournament } from '@/hooks/use-queries';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { getErrorMessage } from '@/utils/error';

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tournamentId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { data: tournament, isLoading, isError } = useTournament(tournamentId);
  const deleteTournament = useDeleteTournament();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteTournament.mutateAsync(tournamentId);
      router.back();
    } catch (e) {
      setError(getErrorMessage(e));
      setConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <AppScreen>
        <AppHeader title={t('tournament.edit')} showBack />
        <LoadingView label={t('tournament.loading')} />
      </AppScreen>
    );
  }

  if (isError || !tournament) {
    return (
      <AppScreen>
        <AppHeader title={t('tournament.edit')} showBack />
        <EmptyState
          icon="trophy-outline"
          title={t('tournament.notFoundTitle')}
          subtitle={t('tournament.notFoundMessage')}
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader
        title={t('tournament.edit')}
        subtitle={tournament.name}
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
      <TournamentForm tournamentId={tournamentId} />
      <ConfirmModal
        visible={confirm}
        title={t('tournament.deleteTitle')}
        message={t('tournament.deleteMessage', { name: tournament.name })}
        confirmLabel={t('common.delete')}
        destructive
        loading={deleteTournament.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirm(false)}
      />
    </AppScreen>
  );
}