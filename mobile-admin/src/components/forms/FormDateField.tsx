import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useController } from 'react-hook-form';
import { AppModal } from '@/components/ui/AppModal';
import { AppText } from '@/components/ui/AppText';
import { AppTextField } from '@/components/ui/AppTextField';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { formatDateTime } from '@/utils/format';

export interface FormDateFieldProps {
  name: string;
  label: string;
}

/** Campo de fecha/hora conectado a react-hook-form (datepicker nativo). */
export function FormDateField({ name, label }: FormDateFieldProps) {
  const { t } = useI18n();
  const { field, fieldState } = useController({ name });
  const { colors } = useTheme();
  const [show, setShow] = useState(false);

  const isoValue = field.value ? String(field.value) : '';
  const date = isoValue && !Number.isNaN(new Date(isoValue).getTime()) ? new Date(isoValue) : new Date();

  const picker = (
    <DateTimePicker
      value={date}
      mode="datetime"
      display="spinner"
      onChange={(event, next) => {
        if (event.type === 'set' && next) {
          field.onChange(next.toISOString());
        }
        setShow(false);
      }}
    />
  );

  return (
    <View style={styles.wrap}>
      <AppText variant="label" style={styles.label}>
        {label}
      </AppText>

      {Platform.OS === 'web' ? (
        <AppTextField
          value={isoValue}
          onChangeText={(text) => {
            const parsed = new Date(text);
            field.onChange(Number.isNaN(parsed.getTime()) ? text : parsed.toISOString());
          }}
          placeholder="YYYY-MM-DDTHH:mm"
          error={fieldState.error?.message}
        />
      ) : (
        <>
          <Pressable
            onPress={() => setShow(true)}
            style={[
              styles.field,
              {
                backgroundColor: colors.surface,
                borderColor: fieldState.error ? colors.danger : colors.border,
              },
            ]}
          >
            <AppText variant="body" color={isoValue ? colors.textPrimary : colors.textMuted}>
              {isoValue ? formatDateTime(isoValue) : t('common.selectDate')}
            </AppText>
          </Pressable>
          {fieldState.error ? (
            <AppText variant="caption" color={colors.danger} style={styles.message}>
              {fieldState.error.message}
            </AppText>
          ) : null}
          <AppModal visible={show} title={label} onClose={() => setShow(false)}>
            {picker}
          </AppModal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { marginBottom: spacing.xs, marginLeft: spacing.xxs },
  field: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  message: { marginTop: spacing.xxs, marginLeft: spacing.xxs },
});