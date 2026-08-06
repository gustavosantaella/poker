import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { LoadingView } from '@/components/ui/LoadingView';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { GAME_TYPE_PRESETS } from '@/constants';
import { useAllGameTypes, useCreateGameType, useUpdateGameType } from '@/hooks/use-queries';
import { gameTypeSchema, GameTypeFormValues } from '@/schemas/gameType.schema';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { getErrorMessage } from '@/utils/error';
import { AppForm } from './AppForm';
import { FormNumberField } from './FormNumberField';
import { FormSwitch } from './FormSwitch';
import { FormTextField } from './FormTextField';
import { useFormContext } from 'react-hook-form';

interface GameTypeFormProps {
  gameTypeId?: number;
}

/** Rellenado rapido con preset de tipo de juego conocido. */
function PresetFiller() {
  const { colors } = useTheme();
  const { setValue } = useFormContext();

  const fill = (preset: (typeof GAME_TYPE_PRESETS)[number]) => {
    setValue('name', preset.name);
    setValue('description', preset.description);
    setValue('holeCards', preset.holeCards);
    setValue('communityCards', preset.communityCards);
  };

  return (
    <View style={styles.presets}>
      {GAME_TYPE_PRESETS.map((preset) => (
        <Pressable
          key={preset.name}
          onPress={() => fill(preset)}
          style={({ pressed }) => [
            styles.presetChip,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <AppText variant="caption" weight="semibold">
            {preset.name}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

/** Formulario reutilizable para crear o editar un tipo de juego. */
export function GameTypeForm({ gameTypeId }: GameTypeFormProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: all, isLoading } = useAllGameTypes();
  const createGameType = useCreateGameType();
  const updateGameType = useUpdateGameType();
  const [serverError, setServerError] = useState<string | null>(null);

  const gameType = gameTypeId ? all?.items.find((g) => g.id === gameTypeId) : undefined;

  if (isLoading || (gameTypeId && !gameType)) {
    return (
      <AppCard>
        <LoadingView label="Loading game type..." />
      </AppCard>
    );
  }

  const defaultValues: GameTypeFormValues = gameType
    ? {
        name: gameType.name,
        description: gameType.description ?? '',
        holeCards: gameType.holeCards,
        communityCards: gameType.communityCards,
        isActive: gameType.isActive,
      }
    : {
        name: '',
        description: '',
        holeCards: 2,
        communityCards: 5,
        isActive: true,
      };

  const handleSubmit = async (values: GameTypeFormValues) => {
    setServerError(null);
    const payload = {
      name: values.name,
      description: values.description || undefined,
      holeCards: Number(values.holeCards),
      communityCards: Number(values.communityCards),
      isActive: values.isActive,
    };
    try {
      if (gameTypeId) {
        await updateGameType.mutateAsync({ id: gameTypeId, payload });
      } else {
        await createGameType.mutateAsync(payload);
      }
      router.back();
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <AppForm schema={gameTypeSchema} defaultValues={defaultValues} onSubmit={handleSubmit}>
      {({ handleSubmit, formState }) => (
        <View>
          {!gameTypeId ? (
            <>
              <SectionHeader title="Quick presets" />
              <PresetFiller />
            </>
          ) : null}

          <SectionHeader title="Game type" />
          <AppCard>
            <FormTextField name="name" label="Name" placeholder="e.g. Texas Hold'em" autoCapitalize="words" />
            <FormTextField name="description" label="Description" placeholder="Optional" multiline numberOfLines={3} />
            <View style={styles.row}>
              <View style={styles.col}>
                <FormNumberField name="holeCards" label="Hole cards" />
              </View>
              <View style={styles.col}>
                <FormNumberField name="communityCards" label="Community cards" />
              </View>
            </View>
            <FormSwitch name="isActive" label="Active" description="Available for new tables and tournaments" />
          </AppCard>

          {serverError ? (
            <AppText variant="caption" color={colors.danger} style={styles.error}>
              {serverError}
            </AppText>
          ) : null}

          <AppButton
            title={gameTypeId ? 'Save changes' : 'Create game type'}
            onPress={handleSubmit}
            loading={formState.isSubmitting || createGameType.isPending || updateGameType.isPending}
            fullWidth
            style={styles.submit}
          />
        </View>
      )}
    </AppForm>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  error: { marginBottom: 8 },
  submit: { marginTop: 8 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
});