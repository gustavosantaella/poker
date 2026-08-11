import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { LinearGradient } from 'expo-linear-gradient';

export interface AppCardProps {
  children: ReactNode;
  onPress?: () => void;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'metallic' | 'gold';
}

/** Tarjeta con soporte para degradados metálicos, de oro y superficies del tema. */
export function AppCard({ children, onPress, padded = true, style, variant = 'metallic' }: AppCardProps) {
  const { colors, isDark } = useTheme();

  const getGradientColors = (): [string, string, ...string[]] => {
    if (!isDark) {
      return [colors.surface, colors.surface];
    }
    if (variant === 'gold') {
      return ['#7A581C', '#BD9A5A', '#F7DF9E', '#E4C17C', '#BD9A5A', '#7A581C']; // Oro metalizado reflectivo
    }
    if (variant === 'metallic') {
      return ['#0C0E14', '#181C26', '#262F40', '#181C26', '#0C0E14']; // Metálico reflectivo oscuro
    }
    return [colors.surface, colors.surface];
  };

  const getBorderColor = () => {
    if (variant === 'gold') return '#E8C887';
    return colors.border;
  };

  const gradientColors = getGradientColors();

  const content = (
    <View style={{ padding: padded ? spacing.md : 0, flex: 1 }}>
      {children}
    </View>
  );

  const cardStyle = [
    styles.card,
    {
      borderColor: getBorderColor(),
      shadowColor: variant === 'gold' ? '#F7DF9E' : colors.primary,
    },
    style,
  ];

  if (onPress) {
    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={cardStyle}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            { flex: 1, borderRadius: radius.lg },
            pressed && { opacity: 0.88 }
          ]}
        >
          {content}
        </Pressable>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={cardStyle}
    >
      {content}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    // iOS shadow (brillo sutil)
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    // Android elevation
    elevation: 4,
  },
});
