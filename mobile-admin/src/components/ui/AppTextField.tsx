import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useTheme } from '@/theme';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { AppText } from './AppText';

export interface AppTextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
}

/** Campo de texto estilizado con label, error y toggle de contrasena. */
export function AppTextField({
  label,
  error,
  helper,
  style,
  secureTextEntry,
  ...props
}: AppTextFieldProps) {
  const { colors } = useTheme();
  const [secure, setSecure] = useState(!!secureTextEntry);

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
          },
        ]}
      >
        <TextInput
          {...props}
          secureTextEntry={secure}
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            { color: colors.textPrimary },
            secureTextEntry && styles.inputWithIcon,
            style,
          ]}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setSecure((s) => !s)}
            hitSlop={8}
            style={styles.eye}
            accessibilityRole="button"
          >
            <Ionicons
              name={secure ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.message}>
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" style={styles.message}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { marginBottom: spacing.xs, marginLeft: spacing.xxs },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  input: {
    flex: 1,
    fontSize: typography.size.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  inputWithIcon: { paddingRight: 44 },
  eye: { paddingHorizontal: spacing.sm, position: 'absolute', right: 0 },
  message: { marginTop: spacing.xxs, marginLeft: spacing.xxs },
});