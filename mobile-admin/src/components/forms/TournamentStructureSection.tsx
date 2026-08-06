import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFormContext } from 'react-hook-form';
import { generateStructure, GenerateStructureResult } from '@/api/tournaments';
import { AnteMode, BlindConfig, BlindGrowth } from '@/api/types';
import { BlindStructurePreview } from '@/components/features/BlindStructurePreview';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ANTE_MODE_OPTIONS, GROWTH_OPTIONS } from '@/constants';
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
  const { watch } = useFormContext<TournamentFormValues>();
  const [preview, setPreview] = useState<GenerateStructureResult | null>(initialStructure);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const w = watch();

  const buildConfig = (): BlindConfig => ({
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
  });

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateStructure(buildConfig());
      setPreview(result);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SectionHeader title="Blind structure" />
      <AppCard>
        <FormNumberField name="startingStack" label="Starting stack (chips)" />
        <FormNumberField
          name="startingBigBlind"
          label="Starting big blind (optional)"
          helper="Auto = starting stack ÷ 100 (deep stack)"
        />
        <View style={styles.row}>
          <View style={styles.col}>
            <FormNumberField name="levelDurationMin" label="Minutes per level" />
          </View>
          <View style={styles.col}>
            <FormNumberField name="numberOfLevels" label="Total levels (optional)" helper="Auto until BB ≈ 5% of stack" />
          </View>
        </View>
        <FormSegmented name="growth" label="Blind growth" options={GROWTH_OPTIONS} />
        <FormSegmented name="anteMode" label="Ante mode" options={ANTE_MODE_OPTIONS} />
        <View style={styles.row}>
          <View style={styles.col}>
            <FormNumberField name="anteStartLevel" label="Antes start at level (optional)" />
          </View>
          <View style={styles.col}>
            <FormNumberField name="breakEveryLevels" label="Break every N levels" />
          </View>
        </View>
        <FormNumberField name="breakDurationMin" label="Break duration (minutes)" />
      </AppCard>

      <SectionHeader title="Preview" />
      <BlindStructurePreview
        items={preview?.items}
        summary={preview?.summary}
        loading={loading}
        error={error ?? undefined}
      />
      <AppButton
        title="Generate blind structure"
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