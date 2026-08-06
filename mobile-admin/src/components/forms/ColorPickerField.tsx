import { Pressable, StyleSheet, View } from 'react-native';
import { useController, useFormContext } from 'react-hook-form';
import { CHIP_COLOR_PRESETS } from '@/constants';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { AppText } from '@/components/ui/AppText';

export interface ColorPickerFieldProps {
  name: string;
  colorNameField: string;
  label?: string;
}

/** Selector de color de ficha: paleta de presets + hex editable. */
export function ColorPickerField({ name, colorNameField, label = 'Chip color' }: ColorPickerFieldProps) {
  const { colors } = useTheme();
  const { field, fieldState } = useController({ name });
  const { setValue } = useFormContext();

  const hex = field.value ? String(field.value) : '';
  const isHexValid = /^#[0-9A-Fa-f]{6}$/.test(hex);

  const selectPreset = (preset: { name: string; hex: string }) => {
    field.onChange(preset.hex);
    setValue(colorNameField, preset.name);
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="label" style={styles.label}>
        {label}
      </AppText>
      <View style={styles.palette}>
        {CHIP_COLOR_PRESETS.map((preset) => {
          const active = hex.toUpperCase() === preset.hex.toUpperCase();
          return (
            <Pressable
              key={preset.hex}
              onPress={() => selectPreset(preset)}
              style={[
                styles.swatch,
                {
                  backgroundColor: preset.hex,
                  borderWidth: active ? 3 : 1,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.hexRow}>
        <View
          style={[
            styles.preview,
            {
              backgroundColor: isHexValid ? hex : colors.surfaceMuted,
              borderColor: colors.border,
            },
          ]}
        />
        <AppText variant="caption" color={isHexValid ? undefined : colors.danger}>
          {isHexValid ? hex : 'Select a preset or type a hex color'}
        </AppText>
      </View>
      {fieldState.error ? (
        <AppText variant="caption" color={colors.danger} style={styles.message}>
          {fieldState.error.message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { marginBottom: spacing.xs, marginLeft: spacing.xxs },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  hexRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  preview: { width: 22, height: 22, borderRadius: 11, borderWidth: 1 },
  message: { marginTop: spacing.xxs, marginLeft: spacing.xxs },
});