import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { AppForm } from '@/components/forms/AppForm';
import { FormTextField } from '@/components/forms/FormTextField';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/i18n/I18nProvider';
import { createRegisterSchema, RegisterValues } from '@/schemas/auth.schema';
import { useTheme } from '@/theme';
import { layout } from '@/theme/spacing';
import { getErrorMessage } from '@/utils/error';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = useMemo(() => createRegisterSchema(t), [t]);

  const onSubmit = async (values: RegisterValues) => {
    setServerError(null);
    try {
      await register(
        values.name.trim(),
        values.email.trim(),
        values.password,
        values.inviteCode?.trim() || undefined,
      );
      router.replace('/(tabs)');
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <AppScreen>
      <AppHeader title={t('auth.createAccount')} showBack />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.logoArea}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Ionicons name="diamond" size={36} color={colors.onPrimary} />
          </View>
          <AppText variant="title">PokeLAP Admin</AppText>
          <AppText variant="caption">{t('auth.registerSubtitle')}</AppText>
        </View>

        <AppForm
          schema={schema}
          defaultValues={{ name: '', email: '', password: '', confirmPassword: '', inviteCode: '' }}
          onSubmit={onSubmit}
        >
          {({ handleSubmit, formState }) => (
            <View style={styles.form}>
              <AppCard>
                <FormTextField
                  name="name"
                  label={t('auth.name')}
                  placeholder={t('auth.namePlaceholder')}
                  autoCapitalize="words"
                />
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
                  placeholder={t('auth.passwordHint')}
                  secureTextEntry
                />
                <FormTextField
                  name="confirmPassword"
                  label={t('auth.confirmPassword')}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  secureTextEntry
                />
                <FormTextField
                  name="inviteCode"
                  label={t('auth.inviteCode')}
                  placeholder={t('auth.inviteCodePlaceholder')}
                  helper={t('auth.inviteCodeHint')}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </AppCard>

              {serverError ? (
                <AppText variant="caption" color={colors.danger} style={styles.error}>
                  {serverError}
                </AppText>
              ) : null}

              <AppButton title={t('auth.createAccount')} onPress={handleSubmit(onSubmit)} loading={formState.isSubmitting} fullWidth />
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