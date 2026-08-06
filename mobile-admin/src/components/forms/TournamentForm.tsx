import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { GenerateStructureResult } from '@/api/tournaments';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { LoadingView } from '@/components/ui/LoadingView';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TOURNAMENT_STATUS_VALUES } from '@/constants';
import { useCreateTournament, useGameTypes, useTournament, useUpdateTournament } from '@/hooks/use-queries';
import { TranslationKey } from '@/i18n';
import { useI18n } from '@/i18n/I18nProvider';
import { createTournamentSchema, TournamentFormValues } from '@/schemas/tournament.schema';
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

/** Campo de jugadores maximos: se oculta cuando el torneo es de jugadores ilimitados. */
function MaxPlayersField() {
  const { t } = useI18n();
  const unlimited = useWatch({ name: 'maxPlayersUnlimited' });
  if (unlimited) return null;
  return <FormNumberField name="maxPlayers" label={t('tournament.maxPlayers')} />;
}

/** Campo de max. re-entradas: se oculta cuando la re-entrada es ilimitada. */
function MaxReEntriesField() {
  const { t } = useI18n();
  const reEntryUnlimited = useWatch({ name: 'reEntryUnlimited' });
  if (reEntryUnlimited) return null;
  return <FormNumberField name="maxReEntries" label={t('tournament.maxReEntries')} />;
}

/** Campo de jugadores premiados: cambia el label segun sea % o cantidad fija. */
function PaidPlacesValueField() {
  const { t } = useI18n();
  const type = useWatch({ name: 'paidPlacesType' });
  return (
    <FormNumberField
      name="paidPlacesValue"
      label={type === 'fixed' ? t('tournament.paidPlacesFixed') : t('tournament.paidPlacesPercent')}
    />
  );
}

/** Campos de add-on: se ocultan cuando el add-on esta desactivado. */
function AddOnFields() {
  const { t } = useI18n();
  const enabled = useWatch({ name: 'addOnEnabled' });
  if (!enabled) return null;
  return (
    <>
      <View style={styles.row}>
        <View style={styles.col}>
          <FormNumberField name="addOnAmount" label={t('tournament.addOnCost')} />
        </View>
        <View style={styles.col}>
          <FormNumberField name="addOnStack" label={t('tournament.addOnChips')} />
        </View>
      </View>
      <FormNumberField
        name="addOnUntilLevel"
        label={t('tournament.addOnUntilLevel')}
        helper={t('tournament.addOnUntilLevelHelper')}
      />
    </>
  );
}

/** Campo de inscripcion tardia: se oculta cuando esta desactivada. */
function LateRegistrationField() {
  const { t } = useI18n();
  const enabled = useWatch({ name: 'lateRegistrationEnabled' });
  if (!enabled) return null;
  return <FormNumberField name="lateRegistrationUntilLevel" label={t('tournament.availableUntilLevel')} />;
}

/** Controles de re-entrada: se ocultan cuando la re-entrada no esta disponible. */
function ReEntryFields() {
  const { t } = useI18n();
  const enabled = useWatch({ name: 'reEntryEnabled' });
  if (!enabled) return null;
  return (
    <>
      <FormSwitch
        name="reEntryUnlimited"
        label={t('tournament.reEntryUnlimited')}
        description={t('tournament.reEntryUnlimitedDesc')}
      />
      <MaxReEntriesField />
    </>
  );
}

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
  const { t } = useI18n();
  const { data: gameTypes, isLoading: gameTypesLoading } = useGameTypes();
  const { data: tournament, isLoading: tournamentLoading } = useTournament(tournamentId ?? 0);
  const createTournament = useCreateTournament();
  const updateTournament = useUpdateTournament();
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = useMemo(() => createTournamentSchema(t), [t]);

  if (gameTypesLoading || (tournamentId && tournamentLoading) || (tournamentId && !tournament)) {
    return (
      <AppCard>
        <LoadingView label={t('tournament.loading')} />
      </AppCard>
    );
  }

  const gameTypeOptions = (gameTypes ?? []).map((g) => ({ label: g.name, value: String(g.id) }));

  const statusOptions = TOURNAMENT_STATUS_VALUES.map((value) => ({
    label: t(`status.${value}` as TranslationKey),
    value,
  }));

  const paidPlacesOptions = [
    { label: t('tournament.percent'), value: 'percent' },
    { label: t('tournament.fixed'), value: 'fixed' },
  ];
  const adminFeeOptions = [
    { label: t('tournament.percent'), value: 'percent' },
    { label: t('tournament.fixed'), value: 'fixed' },
  ];

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
        maxPlayers: tournament.maxPlayers ?? undefined,
        maxPlayersUnlimited: tournament.maxPlayers == null,
        registrationOpen: tournament.registrationOpen,
        reEntryEnabled: tournament.reEntryEnabled,
        reEntryUnlimited: tournament.maxReEntries === 0,
        maxReEntries: tournament.maxReEntries ?? undefined,
        lateRegistrationEnabled: tournament.lateRegistrationEnabled,
        lateRegistrationUntilLevel: tournament.lateRegistrationUntilLevel ?? undefined,
        addOnEnabled: tournament.addOnEnabled,
        addOnAmount: tournament.addOnAmount ?? undefined,
        addOnStack: tournament.addOnStack ?? undefined,
        addOnUntilLevel: tournament.addOnUntilLevel ?? undefined,
        guaranteedPrize: tournament.guaranteedPrize ?? undefined,
        paidPlacesType: tournament.paidPlacesType ?? 'percent',
        paidPlacesValue: tournament.paidPlacesValue ?? 15,
        adminFeeType: tournament.adminFeeType ?? 'percent',
        adminFeeValue: tournament.adminFeeValue ?? undefined,
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
        maxPlayersUnlimited: false,
        registrationOpen: true,
        reEntryEnabled: true,
        reEntryUnlimited: false,
        maxReEntries: 2,
        lateRegistrationEnabled: true,
        lateRegistrationUntilLevel: 6,
        addOnEnabled: true,
        addOnAmount: 40,
        addOnStack: 15000,
        addOnUntilLevel: 6,
        guaranteedPrize: undefined,
        paidPlacesType: 'percent',
        paidPlacesValue: 15,
        adminFeeType: 'percent',
        adminFeeValue: undefined,
        startingBigBlind: undefined,
        levelDurationMin: 20,
        numberOfLevels: undefined,
        growth: 'normal',
        anteMode: 'bb_ante',
        anteStartLevel: undefined,
        breakEveryLevels: 4,
        breakDurationMin: 10,
      };  const onSubmit = async (values: TournamentFormValues) => {
    setServerError(null);
    const payload = {
      name: values.name,
      gameTypeId: Number(values.gameTypeId),
      startDate: values.startDate,
      status: values.status,
      buyIn: Number(values.buyIn),
      fee: Number(values.fee ?? 0),
      startingStack: Number(values.startingStack),
      maxPlayers: values.maxPlayersUnlimited ? null : values.maxPlayers == null ? 9 : Number(values.maxPlayers),
      registrationOpen: values.registrationOpen,
      reEntryEnabled: values.reEntryEnabled,
      maxReEntries: values.reEntryEnabled
        ? values.reEntryUnlimited
          ? 0
          : values.maxReEntries != null
            ? Number(values.maxReEntries)
            : 0
        : 0,
      lateRegistrationEnabled: values.lateRegistrationEnabled,
      lateRegistrationUntilLevel:
        values.lateRegistrationEnabled && values.lateRegistrationUntilLevel != null
          ? Number(values.lateRegistrationUntilLevel)
          : 0,
      addOnEnabled: values.addOnEnabled,
      addOnAmount: values.addOnEnabled && values.addOnAmount != null ? Number(values.addOnAmount) : 0,
      addOnStack: values.addOnEnabled && values.addOnStack != null ? Number(values.addOnStack) : 0,
      addOnUntilLevel: values.addOnEnabled && values.addOnUntilLevel != null ? Number(values.addOnUntilLevel) : 0,
      guaranteedPrize: values.guaranteedPrize != null ? Number(values.guaranteedPrize) : null,
      paidPlacesType: values.paidPlacesType,
      paidPlacesValue: values.paidPlacesValue != null ? Number(values.paidPlacesValue) : 0,
      adminFeeType: values.adminFeeType,
      adminFeeValue: values.adminFeeValue != null ? Number(values.adminFeeValue) : null,
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
        maxPlayers: values.maxPlayersUnlimited ? null : values.maxPlayers == null ? null : Number(values.maxPlayers),
        addOnEnabled: values.addOnEnabled,
        addOnStack: values.addOnEnabled && values.addOnStack != null ? Number(values.addOnStack) : undefined,
        reEntryEnabled: values.reEntryEnabled,
        maxReEntries: values.reEntryEnabled
          ? values.reEntryUnlimited
            ? 0
            : values.maxReEntries != null
              ? Number(values.maxReEntries)
              : 0
          : 0,
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
    <AppForm schema={schema} defaultValues={defaultValues} onSubmit={onSubmit}>
      {({ handleSubmit, formState }) => {
        return (
        <View>
          <SectionHeader title={t('tournament.details')} />
          <AppCard>
            <FormTextField name="name" label={t('tournament.name')} placeholder={t('tournament.namePlaceholder')} />
            <FormSelect name="gameTypeId" label={t('tournament.gameType')} placeholder={t('tournament.gameTypePlaceholder')} options={gameTypeOptions} />
            <FormDateField name="startDate" label={t('tournament.startDate')} />
            <FormSegmented name="status" label={t('tournament.status')} options={statusOptions} />
            <FormSwitch
              name="maxPlayersUnlimited"
              label={t('tournament.unlimitedPlayers')}
              description={t('tournament.unlimitedPlayersDesc')}
            />
            <MaxPlayersField />
            <FormSwitch name="registrationOpen" label={t('tournament.registrationOpen')} description={t('tournament.registrationOpenDesc')} />
          </AppCard>

          <SectionHeader title={t('tournament.cost')} />
          <AppCard>
            <View style={styles.row}>
              <View style={styles.col}>
                <FormNumberField name="buyIn" label={t('tournament.buyIn')} />
              </View>
              <View style={styles.col}>
                <FormNumberField name="fee" label={t('tournament.entryFee')} />
              </View>
            </View>
          </AppCard>

          <SectionHeader title={t('tournament.prize')} />
          <AppCard>
            <FormNumberField
              name="guaranteedPrize"
              label={t('tournament.guaranteedPrize')}
              helper={t('tournament.guaranteedPrizeHelper')}
            />
            <FormSegmented name="paidPlacesType" label={t('tournament.paidPlaces')} options={paidPlacesOptions} />
            <PaidPlacesValueField />
            <FormNumberField name="adminFeeValue" label={t('tournament.adminFee')} helper={t('tournament.adminFeeHelper')} />
            <FormSegmented name="adminFeeType" label={t('tournament.feeType')} options={adminFeeOptions} />
          </AppCard>

          <SectionHeader title={t('tournament.reEntry')} />
          <AppCard>
            <FormSwitch
              name="reEntryEnabled"
              label={t('tournament.reEntryEnabled')}
              description={t('tournament.reEntryDesc')}
            />
            <ReEntryFields />
          </AppCard>

          <SectionHeader title={t('tournament.lateRegistration')} />
          <AppCard>
            <FormSwitch
              name="lateRegistrationEnabled"
              label={t('tournament.lateRegistrationEnabled')}
              description={t('tournament.lateRegistrationDesc')}
            />
            <LateRegistrationField />
          </AppCard>

          <SectionHeader title={t('tournament.addOn')} />
          <AppCard>
            <FormSwitch
              name="addOnEnabled"
              label={t('tournament.addOnEnabled')}
              description={t('tournament.addOnDesc')}
            />
            <AddOnFields />
          </AppCard>

          <TournamentStructureSection initialStructure={initialStructure} />

          {serverError ? (
            <AppText variant="caption" color={colors.danger} style={styles.error}>
              {serverError}
            </AppText>
          ) : null}

          <AppButton
            title={tournamentId ? t('common.saveChanges') : t('tournament.create')}
            onPress={handleSubmit(onSubmit)}
            loading={formState.isSubmitting || createTournament.isPending || updateTournament.isPending}
            fullWidth
            style={styles.submit}
          />
        </View>
        );
      }}
    </AppForm>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  error: { marginBottom: 8 },
  submit: { marginTop: 8, marginBottom: 24 },
});