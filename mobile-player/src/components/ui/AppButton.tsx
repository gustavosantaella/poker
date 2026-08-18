import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Degradado dorado casino para la acción principal. */
const GOLD_GRADIENT: [string, string, ...string[]] = ['#F6DD9A', '#E3B341', '#C68E1B'];

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
}: AppButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';

  const backgrounds: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.surfaceMuted,
    ghost: 'transparent',
    danger: colors.danger,
    success: colors.success,
  };

  const foreground: Record<ButtonVariant, string> = {
    primary: colors.onPrimary,
    secondary: colors.textPrimary,
    ghost: colors.primary,
    danger: colors.onPrimary,
    success: colors.onPrimary,
  };

  const heights: Record<ButtonSize, number> = { sm: 36, md: 46, lg: 54 };
  const fontSizes: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 17 };
  const borderRadius = size === 'sm' ? radius.sm : radius.md;

  const content = loading ? (
    <ActivityIndicator color={foreground[variant]} size="small" />
  ) : (
    <View style={styles.content}>
      {icon ? <Ionicons name={icon} size={fontSizes[size]} color={foreground[variant]} /> : null}
      <Text
        style={{
          color: foreground[variant],
          fontSize: fontSizes[size],
          fontWeight: typography.weight.semibold,
          letterSpacing: 0.3,
        }}
      >
        {title}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: isPrimary ? 'transparent' : backgrounds[variant],
          height: heights[size],
          borderRadius,
          opacity: isDisabled ? 0.55 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.97 : 1 }],
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: variant === 'ghost' ? colors.primary : undefined,
          alignSelf: fullWidth ? 'stretch' : 'auto',
          // Brillo dorado de la acción principal.
          ...(isPrimary && !isDisabled && {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 8,
          }),
        },
        style,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={GOLD_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fill, { borderRadius }]}
        >
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
});
