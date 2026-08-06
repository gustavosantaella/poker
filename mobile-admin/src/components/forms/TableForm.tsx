import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { LoadingView } from '@/components/ui/LoadingView';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TABLE_STATUS_VALUES } from '@/constants';
import { useCreateTable, useGameTypes, useTable, useUpdateTable } from '@/hooks/use-queries';
import { useI18n } from '@/i18n/I18nProvider';
import { TranslationKey } from '@/i18n';
import { createTableSchema, TableFormValues } from '@/schemas/table.schema';
import { useTheme } from '@/theme';
import { getErrorMessage } from '@/utils/error';
import { AppForm } from './AppForm';
import { FormNumberField } from './FormNumberField';
import { FormSegmented } from './FormSegmented';
import { FormSelect } from './FormSelect';
import { FormTextField } from './FormTextField';

interface TableFormProps {
  tableId?: number;
}

/** Formulario reutilizable para crear o editar una mesa cash. */
export function TableForm({ tableId }: TableFormProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { data: gameTypes, isLoading: gameTypesLoading } = useGameTypes();
  const { data: table, isLoading: tableLoading } = useTable(tableId);
  const createTable = useCreateTable();
  const updateTable = useUpdateTable();
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = useMemo(() => createTableSchema(t), [t]);

  const statusOptions = TABLE_STATUS_VALUES.map((value) => ({
    label: t(`status.${value}` as TranslationKey),
    value,
  }));

  if (gameTypesLoading || (tableId && tableLoading) || (tableId && !table)) {
    return (
      <AppCard>
        <LoadingView label={t('table.loading')} />
      </AppCard>
    );
  }

  const gameTypeOptions = (gameTypes ?? []).map((g) => ({ label: g.name, value: String(g.id) }));

  const defaultValues: TableFormValues = table
    ? {
        name: table.name,
        gameTypeId: table.gameTypeId ?? 0,
        smallBlind: table.smallBlind,
        bigBlind: table.bigBlind,
        minBuyIn: table.minBuyIn,
        maxBuyIn: table.maxBuyIn,
        seats: table.seats,
        status: table.status,
        notes: table.notes ?? '',
      }
    : {
        name: '',
        gameTypeId: 0,
        smallBlind: 1,
        bigBlind: 2,
        minBuyIn: 100,
        maxBuyIn: 500,
        seats: 9,
        status: 'open',
        notes: '',
      };

  const onSubmit = async (values: TableFormValues) => {
    setServerError(null);
    try {
      if (tableId) {
        await updateTable.mutateAsync({ id: tableId, payload: values });
      } else {
        await createTable.mutateAsync(values);
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
          <SectionHeader title={t('table.details')} />
          <AppCard>
            <FormTextField name="name" label={t('table.name')} placeholder={t('table.namePlaceholder')} autoCapitalize="words" />
            <FormSelect
              name="gameTypeId"
              label={t('table.gameType')}
              placeholder={t('table.gameTypePlaceholder')}
              options={gameTypeOptions}
            />
            <FormNumberField name="seats" label={t('table.seats')} />
            <FormTextField name="notes" label={t('table.notes')} placeholder={t('common.optional')} multiline numberOfLines={3} />
          </AppCard>

          <SectionHeader title={t('table.blinds')} />
          <AppCard>
            <View style={styles.row}>
              <View style={styles.col}>
                <FormNumberField name="smallBlind" label={t('table.smallBlind')} />
              </View>
              <View style={styles.col}>
                <FormNumberField name="bigBlind" label={t('table.bigBlind')} />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.col}>
                <FormNumberField name="minBuyIn" label={t('table.minBuyIn')} />
              </View>
              <View style={styles.col}>
                <FormNumberField name="maxBuyIn" label={t('table.maxBuyIn')} />
              </View>
            </View>
          </AppCard>

          <SectionHeader title={t('table.status')} />
          <AppCard padded={false}>
            <View style={styles.statusPad}>
              <FormSegmented name="status" options={statusOptions} />
            </View>
          </AppCard>

          {serverError ? (
            <AppText variant="caption" color={colors.danger} style={styles.error}>
              {serverError}
            </AppText>
          ) : null}

          <AppButton
            title={tableId ? t('common.saveChanges') : t('table.create')}
            onPress={handleSubmit(onSubmit)}
            loading={formState.isSubmitting || createTable.isPending || updateTable.isPending}
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
  statusPad: { padding: 16 },
});