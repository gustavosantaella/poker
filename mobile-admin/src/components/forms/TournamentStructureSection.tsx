import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFormContext } from 'react-hook-form';
import { generateStructure, GenerateStructureResult } from '@/api/tournaments';
import { AnteMode, BlindConfig, BlindGrowth } from '@/api/types';
import { BlindStructurePreview } from '@/components/features/BlindStructurePreview';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ANTE_MODE_VALUES, GROWTH_VALUES } from '@/constants';
import { TranslationKey } from '@/i18n';
import { useI18n } from '@/i18n/I18nProvider';
import { TournamentFormValues } from '@/schemas/tournament.schema';
import { getErrorMessage } from '@/utils/error';
import { FormNumberField } from './FormNumberField';
import { FormSegmented } from './FormSegmented';

interface TournamentStructureSectionProps {
  initialStructure?: GenerateStructureResult | null;
}

/** Seccion de estructura de ciegas con preview automatica desde el formulario. */
export function TournamentStructureSection({
  initialStructure = null,
}: TournamentStructureSectionProps) {
  const { t } = useI18n();
  const { getValues, watch } = useFormContext<TournamentFormValues>();
  const [preview, setPreview] = useState<GenerateStructureResult | null>(initialStructure);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const growthOptions = GROWTH_VALUES.map((value) => ({
    label: t(`growth.${value}` as TranslationKey),
    value,
  }));
  const anteModeOptions = ANTE_MODE_VALUES.map((value) => ({
    label: t(`ante.${value}` as TranslationKey),
    value,
  }));

  // Campos del torneo que se reflejan como marcadores en el preview de la estructura.
  const lateRegistrationEnabled = !!watch('lateRegistrationEnabled');
  const lateRegistrationUntilLevel = watch('lateRegistrationUntilLevel');
  const addOnEnabled = !!watch('addOnEnabled');
  const addOnUntilLevel = watch('addOnUntilLevel');
  const lateRegistrationLevel =
    lateRegistrationEnabled && lateRegistrationUntilLevel != null
      ? Number(lateRegistrationUntilLevel)
      : null;
  const addOnLevel =
    addOnEnabled && addOnUntilLevel != null ? Number(addOnUntilLevel) : null;
  const reEntryUnlimited = !!watch('reEntryUnlimited');

  const buildConfig = (w: TournamentFormValues): BlindConfig => ({
    startingStack: Number(w.startingStack) || 0,
    startingBigBlind:
      w.startingBigBlind != null && String(w.startingBigBlind) !== ''
        ? Number(w.startingBigBlind)
        : undefined,
    levelDurationMin: Number(w.levelDurationMin) || 20,
    numberOfLevels:
      w.numberOfLevels != null && String(w.numberOfLevels) !== '' ? Number(w.numberOfLevels) : undefined,
    growth: (w.growth ?? 'normal') as BlindGrowth,
    anteMode: (w.anteMode ?? 'bb_ante') as AnteMode,
    anteStartLevel:
      w.anteStartLevel != null && String(w.anteStartLevel) !== '' ? Number(w.anteStartLevel) : undefined,
    breakEveryLevels: Number(w.breakEveryLevels) || 4,
    breakDurationMin: Number(w.breakDurationMin) || 10,
    maxPlayers: w.maxPlayersUnlimited ? null : w.maxPlayers == null ? null : Number(w.maxPlayers),
    addOnEnabled: w.addOnEnabled,
    addOnStack: w.addOnEnabled && w.addOnStack != null ? Number(w.addOnStack) : undefined,
    reEntryEnabled: w.reEntryEnabled,
    maxReEntries: w.reEntryEnabled && w.maxReEntries != null ? Number(w.maxReEntries) : undefined,
  });

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateStructure(buildConfig(getValues()));
      setPreview(result);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SectionHeader title={t('structure.title')} />
      <AppCard>
        <FormNumberField name="startingStack" label={t('structure.startingStack')} />
        <FormNumberField
          name="startingBigBlind"
          label={t('structure.startingBigBlind')}
          helper={t('structure.startingBigBlindHelper')}
        />
        <View style={styles.row}>
          <View style={styles.col}>
            <FormNumberField name="levelDurationMin" label={t('structure.minutesPerLevel')} />
          </View>
          <View style={styles.col}>
            <FormNumberField name="numberOfLevels" label={t('structure.totalLevels')} helper={t('structure.totalLevelsHelper')} />
          </View>
        </View>
        <FormSegmented name="growth" label={t('structure.blindGrowth')} options={growthOptions} />
        <FormSegmented name="anteMode" label={t('structure.anteMode')} options={anteModeOptions} />
        <View style={styles.row}>
          <View style={styles.col}>
            <FormNumberField name="anteStartLevel" label={t('structure.anteStartLevel')} />
          </View>
          <View style={styles.col}>
            <FormNumberField name="breakEveryLevels" label={t('structure.breakEveryLevels')} />
          </View>
        </View>
        <FormNumberField name="breakDurationMin" label={t('structure.breakDuration')} />
      </AppCard>

      <SectionHeader title={t('structure.preview')} />
      <BlindStructurePreview
        items={preview?.items}
        summary={preview?.summary}
        loading={loading}
        error={error ?? undefined}
        lateRegistrationLevel={lateRegistrationLevel}
        addOnLevel={addOnLevel}
        reEntryUnlimited={reEntryUnlimited}
      />
      <AppButton
        title={t('structure.generate')}
        variant="secondary"
        icon="build-outline"
        onPress={handlePreview}
        loading={loading}
        style={styles.previewBtn}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  previewBtn: { marginTop: 12, marginBottom: 4 },
});