import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { ChipForm } from '@/components/forms/ChipForm';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useChips, useDeleteChip } from '@/hooks/use-queries';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';

export default function ChipDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chipId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
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
        title={t('chip.edit')}
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
        title={t('chip.deleteTitle')}
        message={t('chip.deleteMessage', { color: chip?.color ?? '', value: chip?.value ?? '' })}
        confirmLabel={t('common.delete')}
        destructive
        loading={deleteChip.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirm(false)}
      />
    </AppScreen>
  );
}