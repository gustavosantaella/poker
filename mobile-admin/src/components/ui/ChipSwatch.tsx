import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';

export interface ChipSwatchProps {
  hexColor: string;
  label?: string;
  size?: number;
}

/** Circulo de ficha con el color real de la ficha. */
export function ChipSwatch({ hexColor, label, size = 22 }: ChipSwatchProps) {
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: hexColor,
          },
        ]}
      />
      {label ? (
        <AppText variant="label" numberOfLines={1} style={styles.label}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  circle: { borderWidth: 1, borderColor: 'rgba(128,128,128,0.35)' },
  label: { flexShrink: 1 },
});