import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { AppForm } from '@/components/forms/AppForm';
import { FormTextField } from '@/components/forms/FormTextField';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/i18n/I18nProvider';
import { createLoginSchema, LoginValues } from '@/schemas/auth.schema';
import { useTheme } from '@/theme';
import { layout } from '@/theme/spacing';
import { getErrorMessage } from '@/utils/error';
import { log } from '@/utils/logger';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = useMemo(() => createLoginSchema(t), [t]);

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    log.info(`Login submitted for ${values.email.trim()}`);
    try {
      await login(values.email.trim(), values.password);
      log.info('Login ok - navigating to tabs');
      router.replace('/(tabs)');
    } catch (error) {
      log.error('Login screen error:', error);
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <AppScreen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.logoArea}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Ionicons name="diamond" size={40} color={colors.onPrimary} />
          </View>
          <AppText variant="h1">PokeLAP Admin</AppText>
          <AppText variant="caption">{t('auth.loginSubtitle')}</AppText>
        </View>

        <AppForm schema={schema} defaultValues={{ email: '', password: '' }} onSubmit={onSubmit}>
          {({ handleSubmit, formState }) => (
            <View style={styles.form}>
              <AppCard>
                <FormTextField
                  name="email"
                  label={t('auth.email')}
                  placeholder={t('auth.emailPlaceholder')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                <FormTextField
                  name="password"
                  label={t('auth.password')}
                  placeholder={t('auth.passwordPlaceholder')}
                  secureTextEntry
                />
              </AppCard>

              {serverError ? (
                <AppText variant="caption" color={colors.danger} style={styles.error}>
                  {serverError}
                </AppText>
              ) : null}

              <AppButton title={t('auth.signIn')} onPress={handleSubmit(onSubmit)} loading={formState.isSubmitting} fullWidth />
              <AppButton
                title={t('auth.createAccount')}
                variant="ghost"
                icon="person-add-outline"
                onPress={() => router.push('/register')}
                fullWidth
              />
            </View>
          )}
        </AppForm>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'center', maxWidth: layout.maxWidth, width: '100%', alignSelf: 'center' },
  logoArea: { alignItems: 'center', marginBottom: 28 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  form: { gap: 12 },
  error: { marginBottom: 4 },
});