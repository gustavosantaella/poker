import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

export interface AppCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  onPress?: () => void;
}

export function AppCard({ children, style, padded = true, onPress }: AppCardProps) {
  const { colors } = useTheme();
  const content = <View style={padded ? styles.padded : undefined}>{children}</View>;
  return (
    <View
      style={[
        styles.card,
        { 
          backgroundColor: colors.surface, 
          borderColor: colors.border,
          shadowColor: colors.primary, // subtle gold shadow
        },
        style,
      ]}
    >
      {onPress ? (
        <Pressable 
          onPress={onPress}
          style={({ pressed }) => pressed && { opacity: 0.85 }}
        >
          {content}
        </Pressable>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    // iOS shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    // Android elevation
    elevation: 3,
  },
  padded: { padding: spacing.md },
});
