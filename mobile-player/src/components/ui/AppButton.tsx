import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
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

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: backgrounds[variant],
          height: heights[size],
          borderRadius: size === 'sm' ? radius.sm : radius.md,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: variant === 'ghost' ? colors.primary : undefined,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground[variant]} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={fontSizes[size]} color={foreground[variant]} /> : null}
          <Text
            style={{
              color: foreground[variant],
              fontSize: fontSizes[size],
              fontWeight: typography.weight.semibold,
              marginLeft: icon ? spacing.xs : 0,
            }}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
});
