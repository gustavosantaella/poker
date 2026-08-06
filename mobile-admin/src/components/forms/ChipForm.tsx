import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { LoadingView } from '@/components/ui/LoadingView';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useChips, useCreateChip, useUpdateChip } from '@/hooks/use-queries';
import { useI18n } from '@/i18n/I18nProvider';
import { createChipSchema, ChipFormValues } from '@/schemas/chip.schema';
import { useTheme } from '@/theme';
import { getErrorMessage } from '@/utils/error';
import { AppForm } from './AppForm';
import { ColorPickerField } from './ColorPickerField';
import { FormNumberField } from './FormNumberField';
import { FormSwitch } from './FormSwitch';
import { FormTextField } from './FormTextField';

interface ChipFormProps {
  chipId?: number;
}

/** Formulario reutilizable para crear o editar una ficha. */
export function ChipForm({ chipId }: ChipFormProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { data: chips, isLoading } = useChips();
  const createChip = useCreateChip();
  const updateChip = useUpdateChip();
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = useMemo(() => createChipSchema(t), [t]);

  const chip = chipId ? chips?.items.find((c) => c.id === chipId) : undefined;

  if (isLoading || (chipId && !chip)) {
    return (
      <AppCard>
        <LoadingView label={t('chip.loading')} />
      </AppCard>
    );
  }

  const defaultValues: ChipFormValues = chip
    ? {
        value: chip.value,
        color: chip.color,
        hexColor: chip.hexColor,
        quantity: chip.quantity ?? undefined,
        notes: chip.notes ?? '',
        isActive: chip.isActive,
      }
    : {
        value: 25,
        color: 'White',
        hexColor: '#F5F5F5',
        quantity: undefined,
        notes: '',
        isActive: true,
      };

  const onSubmit = async (values: ChipFormValues) => {
    setServerError(null);
    const payload = {
      value: Number(values.value),
      color: values.color,
      hexColor: values.hexColor,
      quantity: values.quantity == null ? undefined : Number(values.quantity),
      notes: values.notes || undefined,
      isActive: values.isActive,
    };
    try {
      if (chipId) {
        await updateChip.mutateAsync({ id: chipId, payload });
      } else {
        await createChip.mutateAsync(payload);
      }
      router.back();
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <AppForm schema={schema} defaultValues={defaultValues} onSubmit={onSubmit}>
      {({ handleSubmit, formState }) => (
        <View>
          <SectionHeader title={t('chip.section')} />
          <AppCard>
            <FormNumberField name="value" label={t('chip.value')} />
            <FormTextField
              name="color"
              label={t('chip.colorName')}
              placeholder={t('chip.colorNamePlaceholder')}
              autoCapitalize="words"
            />
            <ColorPickerField name="hexColor" colorNameField="color" />
            <FormNumberField name="quantity" label={t('chip.quantity')} />
            <FormTextField name="notes" label={t('chip.notes')} placeholder={t('common.optional')} multiline numberOfLines={2} />
            <FormSwitch name="isActive" label={t('chip.active')} description={t('chip.activeDesc')} />
          </AppCard>

          {serverError ? (
            <AppText variant="caption" color={colors.danger} style={styles.error}>
              {serverError}
            </AppText>
          ) : null}

          <AppButton
            title={chipId ? t('common.saveChanges') : t('chip.create')}
            onPress={handleSubmit(onSubmit)}
            loading={formState.isSubmitting || createChip.isPending || updateChip.isPending}
            fullWidth
            style={styles.submit}
          />
        </View>
      )}
    </AppForm>
  );
}

const styles = StyleSheet.create({
  error: { marginBottom: 8 },
  submit: { marginTop: 8 },
});