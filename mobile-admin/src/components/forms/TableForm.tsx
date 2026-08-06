import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { LoadingView } from '@/components/ui/LoadingView';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TABLE_STATUS_OPTIONS } from '@/constants';
import { useCreateTable, useGameTypes, useTable, useUpdateTable } from '@/hooks/use-queries';
import { tableSchema, TableFormValues } from '@/schemas/table.schema';
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
  const { data: gameTypes, isLoading: gameTypesLoading } = useGameTypes();
  const { data: table, isLoading: tableLoading } = useTable(tableId);
  const createTable = useCreateTable();
  const updateTable = useUpdateTable();
  const [serverError, setServerError] = useState<string | null>(null);

  if (gameTypesLoading || (tableId && tableLoading) || (tableId && !table)) {
    return (
      <AppCard>
        <LoadingView label="Loading table..." />
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
    <AppForm schema={tableSchema} defaultValues={defaultValues} onSubmit={onSubmit}>
      {({ handleSubmit, formState }) => (
        <View>
          <SectionHeader title="Details" />
          <AppCard>
            <FormTextField name="name" label="Table name" placeholder="e.g. Cash Game A" autoCapitalize="words" />
            <FormSelect
              name="gameTypeId"
              label="Game type"
              placeholder="Select a game type"
              options={gameTypeOptions}
            />
            <FormNumberField name="seats" label="Seats" />
            <FormTextField name="notes" label="Notes" placeholder="Optional" multiline numberOfLines={3} />
          </AppCard>

          <SectionHeader title="Blinds & buy-in" />
          <AppCard>
            <View style={styles.row}>
              <View style={styles.col}>
                <FormNumberField name="smallBlind" label="Small blind" />
              </View>
              <View style={styles.col}>
                <FormNumberField name="bigBlind" label="Big blind" />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.col}>
                <FormNumberField name="minBuyIn" label="Min buy-in" />
              </View>
              <View style={styles.col}>
                <FormNumberField name="maxBuyIn" label="Max buy-in" />
              </View>
            </View>
          </AppCard>

          <SectionHeader title="Status" />
          <AppCard padded={false}>
            <View style={styles.statusPad}>
              <FormSegmented name="status" options={TABLE_STATUS_OPTIONS} />
            </View>
          </AppCard>

          {serverError ? (
            <AppText variant="caption" color={colors.danger} style={styles.error}>
              {serverError}
            </AppText>
          ) : null}

          <AppButton
            title={tableId ? 'Save changes' : 'Create table'}
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