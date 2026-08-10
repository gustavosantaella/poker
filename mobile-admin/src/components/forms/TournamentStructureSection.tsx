import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFormContext } from 'react-hook-form';
import { generateStructure, GenerateStructureResult } from '@/api/tournaments';
import { AnteMode, BlindConfig, BlindGrowth, BlindStructureItem, BlindStructureSummary } from '@/api/types';
import { BlindStructureEditor } from '@/components/forms/BlindStructureEditor';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ANTE_MODE_VALUES, GROWTH_VALUES } from '@/constants';
import { TranslationKey } from '@/i18n';
import { useI18n } from '@/i18n/I18nProvider';
import { TournamentFormValues } from '@/schemas/tournament.schema';
import { useTheme } from '@/theme';
import { summarizeStructure } from '@/utils/blind-structure';
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
  const { colors } = useTheme();
  const { getValues, setValue } = useFormContext<TournamentFormValues>();
  const [structure, setStructure] = useState<GenerateStructureResult | null>(initialStructure);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const hasStructure = !!structure?.items?.length;

  const EMPTY_SUMMARY: BlindStructureSummary = {
    levelCount: 0,
    breakCount: 0,
    estimatedDurationMin: 0,
    finalLevel: null,
  };

  const growthOptions = GROWTH_VALUES.map((value) => ({
    label: t(`growth.${value}` as TranslationKey),
    value,
  }));
  const anteModeOptions = ANTE_MODE_VALUES.map((value) => ({
    label: t(`ante.${value}` as TranslationKey),
    value,
  }));

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

  /** Aplica la estructura y la sincroniza al formulario para que se guarde al pulsar Guardar. */
  const applyStructure = (next: GenerateStructureResult) => {
    setStructure(next);
    setValue('blindStructure', next.items.length > 0 ? next.items : undefined, { shouldDirty: true });
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateStructure(buildConfig(getValues()));
      applyStructure(result);
      setSheetOpen(true);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setError(null);
    if (hasStructure) {
      setSheetOpen(true);
    } else {
      void handleGenerate();
    }
  };

  const handleChangeItems = (items: BlindStructureItem[]) => {
    applyStructure({ items, summary: summarizeStructure(items) ?? EMPTY_SUMMARY });
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

      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}
      <AppButton
        title={hasStructure ? t('structure.view') : t('structure.generate')}
        variant="secondary"
        icon={hasStructure ? 'eye-outline' : 'build-outline'}
        onPress={handleOpen}
        loading={loading}
        style={styles.previewBtn}
      />

      <BottomSheet visible={sheetOpen} title={t('structure.title')} onClose={() => setSheetOpen(false)}>
        <BlindStructureEditor
          items={structure?.items ?? []}
          onChange={handleChangeItems}
          onGenerate={handleGenerate}
          generating={loading}
        />
        <AppButton
          title={t('common.close')}
          variant="secondary"
          onPress={() => setSheetOpen(false)}
          style={styles.closeBtn}
          fullWidth
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  previewBtn: { marginTop: 12, marginBottom: 4 },
  closeBtn: { marginTop: 12 },
  error: { marginBottom: 8 },
});