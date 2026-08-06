import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GenerateStructureResult } from '@/api/tournaments';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { LoadingView } from '@/components/ui/LoadingView';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TOURNAMENT_STATUS_OPTIONS } from '@/constants';
import { useCreateTournament, useGameTypes, useTournament, useUpdateTournament } from '@/hooks/use-queries';
import { tournamentSchema, TournamentFormValues } from '@/schemas/tournament.schema';
import { useTheme } from '@/theme';
import { summarizeStructure } from '@/utils/blind-structure';
import { getErrorMessage } from '@/utils/error';
import { AppForm } from './AppForm';
import { FormDateField } from './FormDateField';
import { FormNumberField } from './FormNumberField';
import { FormSegmented } from './FormSegmented';
import { FormSelect } from './FormSelect';
import { FormSwitch } from './FormSwitch';
import { FormTextField } from './FormTextField';
import { TournamentStructureSection } from './TournamentStructureSection';

interface TournamentFormProps {
  tournamentId?: number;
}

function defaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(19, 0, 0, 0);
  return date.toISOString();
}

/** Formulario reutilizable para crear o editar un torneo (estructura automatica). */
export function TournamentForm({ tournamentId }: TournamentFormProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: gameTypes, isLoading: gameTypesLoading } = useGameTypes();
  const { data: tournament, isLoading: tournamentLoading } = useTournament(tournamentId ?? 0);
  const createTournament = useCreateTournament();
  const updateTournament = useUpdateTournament();
  const [serverError, setServerError] = useState<string | null>(null);

  if (gameTypesLoading || (tournamentId && tournamentLoading) || (tournamentId && !tournament)) {
    return (
      <AppCard>
        <LoadingView label="Loading tournament..." />
      </AppCard>
    );
  }

  const gameTypeOptions = (gameTypes ?? []).map((g) => ({ label: g.name, value: String(g.id) }));

  const initialStructure: GenerateStructureResult | null = tournament?.blindStructure
    ? { items: tournament.blindStructure, summary: summarizeStructure(tournament.blindStructure)! }
    : null;

  const bc = tournament?.blindConfig;
  const defaultValues: TournamentFormValues = tournament
    ? {
        name: tournament.name,
        gameTypeId: tournament.gameTypeId ?? 0,
        startDate: tournament.startDate,
        status: tournament.status,
        buyIn: tournament.buyIn,
        fee: tournament.fee,
        startingStack: tournament.startingStack,
        maxPlayers: tournament.maxPlayers,
        registrationOpen: tournament.registrationOpen,
        reEntryEnabled: tournament.reEntryEnabled,
        maxReEntries: tournament.maxReEntries ?? undefined,
        lateRegistrationEnabled: tournament.lateRegistrationEnabled,
        lateRegistrationUntilLevel: tournament.lateRegistrationUntilLevel ?? undefined,
        addOnEnabled: tournament.addOnEnabled,
        addOnAmount: tournament.addOnAmount ?? undefined,
        addOnStack: tournament.addOnStack ?? undefined,
        addOnUntilLevel: tournament.addOnUntilLevel ?? undefined,
        startingBigBlind: bc?.startingBigBlind ?? undefined,
        levelDurationMin: bc?.levelDurationMin ?? 20,
        numberOfLevels: bc?.numberOfLevels ?? undefined,
        growth: bc?.growth ?? 'normal',
        anteMode: bc?.anteMode ?? 'bb_ante',
        anteStartLevel: bc?.anteStartLevel ?? undefined,
        breakEveryLevels: bc?.breakEveryLevels ?? 4,
        breakDurationMin: bc?.breakDurationMin ?? 10,
      }
    : {
        name: '',
        gameTypeId: 0,
        startDate: defaultStartDate(),
        status: 'registering',
        buyIn: 50,
        fee: 5,
        startingStack: 10000,
        maxPlayers: 9,
        registrationOpen: true,
        reEntryEnabled: true,
        maxReEntries: 1,
        lateRegistrationEnabled: true,
        lateRegistrationUntilLevel: 6,
        addOnEnabled: true,
        addOnAmount: 40,
        addOnStack: 15000,
        addOnUntilLevel: 6,
        startingBigBlind: undefined,
        levelDurationMin: 20,
        numberOfLevels: undefined,
        growth: 'normal',
        anteMode: 'bb_ante',
        anteStartLevel: undefined,
        breakEveryLevels: 4,
        breakDurationMin: 10,
      };

  const onSubmit = async (values: TournamentFormValues) => {
    setServerError(null);
    const payload = {
      name: values.name,
      gameTypeId: Number(values.gameTypeId),
      startDate: values.startDate,
      status: values.status,
      buyIn: Number(values.buyIn),
      fee: Number(values.fee ?? 0),
      startingStack: Number(values.startingStack),
      maxPlayers: values.maxPlayers == null ? 9 : Number(values.maxPlayers),
      registrationOpen: values.registrationOpen,
      reEntryEnabled: values.reEntryEnabled,
      maxReEntries: values.reEntryEnabled && values.maxReEntries != null ? Number(values.maxReEntries) : 0,
      lateRegistrationEnabled: values.lateRegistrationEnabled,
      lateRegistrationUntilLevel:
        values.lateRegistrationEnabled && values.lateRegistrationUntilLevel != null
          ? Number(values.lateRegistrationUntilLevel)
          : 0,
      addOnEnabled: values.addOnEnabled,
      addOnAmount: values.addOnEnabled && values.addOnAmount != null ? Number(values.addOnAmount) : 0,
      addOnStack: values.addOnEnabled && values.addOnStack != null ? Number(values.addOnStack) : 0,
      addOnUntilLevel: values.addOnEnabled && values.addOnUntilLevel != null ? Number(values.addOnUntilLevel) : 0,
      blindConfig: {
        startingStack: Number(values.startingStack),
        startingBigBlind: values.startingBigBlind != null ? Number(values.startingBigBlind) : undefined,
        levelDurationMin: Number(values.levelDurationMin),
        numberOfLevels: values.numberOfLevels != null ? Number(values.numberOfLevels) : undefined,
        growth: values.growth,
        anteMode: values.anteMode,
        anteStartLevel: values.anteStartLevel != null ? Number(values.anteStartLevel) : undefined,
        breakEveryLevels: Number(values.breakEveryLevels),
        breakDurationMin: Number(values.breakDurationMin ?? 10),
      },
    };

    try {
      if (tournamentId) {
        await updateTournament.mutateAsync({ id: tournamentId, payload });
      } else {
        await createTournament.mutateAsync(payload);
      }
      router.back();
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <AppForm schema={tournamentSchema} defaultValues={defaultValues} onSubmit={onSubmit}>
      {({ handleSubmit, formState }) => (
        <View>
          <SectionHeader title="Details" />
          <AppCard>
            <FormTextField name="name" label="Tournament name" placeholder="e.g. Sunday Special" />
            <FormSelect name="gameTypeId" label="Game type" placeholder="Select a game type" options={gameTypeOptions} />
            <FormDateField name="startDate" label="Start date & time" />
            <FormSegmented name="status" label="Status" options={TOURNAMENT_STATUS_OPTIONS} />
            <View style={styles.row}>
              <View style={styles.col}>
                <FormNumberField name="maxPlayers" label="Max players" />
              </View>
            </View>
            <FormSwitch name="registrationOpen" label="Registration open" description="Players can register" />
          </AppCard>

          <SectionHeader title="Cost" />
          <AppCard>
            <View style={styles.row}>
              <View style={styles.col}>
                <FormNumberField name="buyIn" label="Buy-in" />
              </View>
              <View style={styles.col}>
                <FormNumberField name="fee" label="Entry fee" />
              </View>
            </View>
          </AppCard>

          <TournamentStructureSection initialStructure={initialStructure} />

          <SectionHeader title="Re-entry (rebuy)" />
          <AppCard>
            <FormSwitch
              name="reEntryEnabled"
              label="Re-entry available"
              description="Allow players to buy back in after busting"
            />
            <FormNumberField name="maxReEntries" label="Max re-entries per player" />
          </AppCard>

          <SectionHeader title="Late registration" />
          <AppCard>
            <FormSwitch
              name="lateRegistrationEnabled"
              label="Late registration available"
              description="Players can join after the start"
            />
            <FormNumberField name="lateRegistrationUntilLevel" label="Available until level" />
          </AppCard>

          <SectionHeader title="Add-on" />
          <AppCard>
            <FormSwitch
              name="addOnEnabled"
              label="Add-on available"
              description="Optional extra chips for an additional cost"
            />
            <View style={styles.row}>
              <View style={styles.col}>
                <FormNumberField name="addOnAmount" label="Add-on cost" />
              </View>
              <View style={styles.col}>
                <FormNumberField name="addOnStack" label="Add-on chips" />
              </View>
            </View>
            <FormNumberField
              name="addOnUntilLevel"
              label="Add-on available until level"
              helper="Usually the end of late registration"
            />
          </AppCard>

          {serverError ? (
            <AppText variant="caption" color={colors.danger} style={styles.error}>
              {serverError}
            </AppText>
          ) : null}

          <AppButton
            title={tournamentId ? 'Save changes' : 'Create tournament'}
            onPress={handleSubmit(onSubmit)}
            loading={formState.isSubmitting || createTournament.isPending || updateTournament.isPending}
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
  submit: { marginTop: 8, marginBottom: 24 },
});