import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { AppForm } from '@/components/forms/AppForm';
import { FormTextField } from '@/components/forms/FormTextField';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from '@/hooks/use-auth';
import { registerSchema, RegisterValues } from '@/schemas/auth.schema';
import { useTheme } from '@/theme';
import { layout } from '@/theme/spacing';
import { getErrorMessage } from '@/utils/error';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { colors } = useTheme();
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (values: RegisterValues) => {
    setServerError(null);
    try {
      await register(values.name.trim(), values.email.trim(), values.password);
      router.replace('/(tabs)');
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <AppScreen>
      <AppHeader title="Create account" showBack />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.logoArea}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Ionicons name="diamond" size={36} color={colors.onPrimary} />
          </View>
          <AppText variant="title">PokeLAP Admin</AppText>
          <AppText variant="caption">Register with email and password</AppText>
        </View>

        <AppForm
          schema={registerSchema}
          defaultValues={{ name: '', email: '', password: '', confirmPassword: '' }}
          onSubmit={handleSubmit}
        >
          {({ handleSubmit, formState }) => (
            <View style={styles.form}>
              <AppCard>
                <FormTextField
                  name="name"
                  label="Name"
                  placeholder="Your full name"
                  autoCapitalize="words"
                />
                <FormTextField
                  name="email"
                  label="Email"
                  placeholder="you@pokelap.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                <FormTextField
                  name="password"
                  label="Password"
                  placeholder="At least 8 characters"
                  secureTextEntry
                />
                <FormTextField
                  name="confirmPassword"
                  label="Confirm password"
                  placeholder="Repeat your password"
                  secureTextEntry
                />
              </AppCard>

              {serverError ? (
                <AppText variant="caption" color={colors.danger} style={styles.error}>
                  {serverError}
                </AppText>
              ) : null}

              <AppButton title="Create account" onPress={handleSubmit} loading={formState.isSubmitting} fullWidth />
            </View>
          )}
        </AppForm>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, maxWidth: layout.maxWidth, width: '100%', alignSelf: 'center' },
  logoArea: { alignItems: 'center', marginTop: 8, marginBottom: 20 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  form: { gap: 12 },
  error: { marginBottom: 4 },
});