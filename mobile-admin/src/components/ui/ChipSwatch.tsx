import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';

export interface ChipSwatchProps {
  hexColor: string;
  label?: string;
  size?: number;
}

/** Circulo de ficha con el color real de la ficha. */
export function ChipSwatch({ hexColor, label, size = 26 }: ChipSwatchProps) {
  const isLightColor = ['#ffffff', '#fff', 'white', '#f6f7f9'].includes(hexColor.toLowerCase());
  const stripeColor = isLightColor ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.35)';

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
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: hexColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.35,
            shadowRadius: 3.5,
            elevation: 3,
          },
        ]}
      >
        {/* Striped border ring inside the chip */}
        <View
          style={{
            width: size * 0.76,
            height: size * 0.76,
            borderRadius: (size * 0.76) / 2,
            borderWidth: 1.5,
            borderColor: stripeColor,
            borderStyle: 'dashed',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Inner ring */}
          <View
            style={{
              width: size * 0.44,
              height: size * 0.44,
              borderRadius: (size * 0.44) / 2,
              borderWidth: 0.8,
              borderColor: stripeColor,
              backgroundColor: 'rgba(0, 0, 0, 0.12)',
            }}
          />
        </View>
      </View>
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