import { ReactNode } from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';
import { useTheme } from '@/theme';
import { typography } from '@/theme/typography';

export type AppTextVariant = 'h1' | 'title' | 'subtitle' | 'body' | 'label' | 'caption' | 'number';

export interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  color?: string;
  weight?: keyof typeof typography.weight;
  center?: boolean;
  children: ReactNode;
}

export function AppText({
  variant = 'body',
  color,
  weight,
  center,
  style,
  children,
  ...props
}: AppTextProps) {
  const { colors } = useTheme();
  const fontSize = typography.size.md;
  const textStyle: TextStyle = {
    color: color ?? colors.textPrimary,
    fontSize,
    lineHeight: Math.round(fontSize * typography.lineHeight.normal),
    fontWeight: weight ?? typography.weight.regular,
  };

  if (variant === 'h1') {
    textStyle.fontSize = typography.size.xxxl;
    textStyle.fontWeight = typography.weight.bold;
    textStyle.lineHeight = Math.round(typography.size.xxxl * typography.lineHeight.tight);
    textStyle.letterSpacing = 0.8;
  } else if (variant === 'title') {
    textStyle.fontSize = typography.size.xl;
    textStyle.fontWeight = typography.weight.bold;
    textStyle.lineHeight = Math.round(typography.size.xl * typography.lineHeight.tight);
    textStyle.letterSpacing = 0.5;
  } else if (variant === 'subtitle') {
    textStyle.fontSize = typography.size.lg;
    textStyle.fontWeight = typography.weight.semibold;
    textStyle.lineHeight = Math.round(typography.size.lg * typography.lineHeight.tight);
  } else if (variant === 'label') {
    textStyle.fontSize = typography.size.sm;
    textStyle.fontWeight = typography.weight.medium;
    textStyle.color = color ?? colors.textSecondary;
    textStyle.lineHeight = Math.round(typography.size.sm * typography.lineHeight.normal);
  } else if (variant === 'caption') {
    textStyle.fontSize = typography.size.xs;
    textStyle.fontWeight = typography.weight.regular;
    textStyle.color = color ?? colors.textMuted;
    textStyle.lineHeight = Math.round(typography.size.xs * typography.lineHeight.normal);
  } else if (variant === 'number') {
    textStyle.fontSize = typography.size.xxl;
    textStyle.fontWeight = typography.weight.bold;
    textStyle.lineHeight = Math.round(typography.size.xxl * typography.lineHeight.tight);
  }

  return (
    <Text {...props} style={[textStyle, center && { textAlign: 'center' }, style as StyleProp<TextStyle>]}>
      {children}
    </Text>
  );
}
