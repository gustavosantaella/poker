import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View, Image, Pressable } from 'react-native';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { uploadAvatar } from '@/api/auth';
import { API_URL } from '@/api/config';
import { AppForm } from '@/components/forms/AppForm';
import { FormTextField } from '@/components/forms/FormTextField';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppModal } from '@/components/ui/AppModal';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppSegmentedControl } from '@/components/ui/AppSegmentedControl';
import { AppText } from '@/components/ui/AppText';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ListItem } from '@/components/ui/ListItem';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAllGameTypes } from '@/hooks/use-queries';
import { useAuth } from '@/hooks/use-auth';
import { Language } from '@/i18n';
import { useI18n } from '@/i18n/I18nProvider';
import { ThemeMode, useTheme } from '@/theme';
import { getErrorMessage } from '@/utils/error';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().optional(),
  address: z.string().max(255).optional(),
  phone: z.string().max(60).optional(),
  city: z.string().max(120).optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

const LANGUAGE_OPTIONS: { label: string; value: Language }[] = [
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
];

// Build the full URL for an avatar stored on the backend
// API_URL ends with /api, so strip that to get the server base
const SERVER_BASE = API_URL.replace(/\/api$/, '');
function buildAvatarUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${SERVER_BASE}${path}`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, updateProfile } = useAuth();
  const { colors, mode, setMode } = useTheme();
  const { t, language, setLanguage } = useI18n();
  const { data: gameTypes } = useAllGameTypes();
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [photoLocalUri, setPhotoLocalUri] = useState<string | null>(null);

  const themeOptions = [
    { label: t('settings.themeLight'), value: 'light' },
    { label: t('settings.themeDark'), value: 'dark' },
    { label: t('settings.themeSystem'), value: 'system' },
  ];

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      setPhotoLocalUri(result.assets[0].uri);
    }
  };

  const handleUpdateProfile = async (values: ProfileValues) => {
    setServerError(null);
    try {
      let photoUrl: string | undefined = undefined;
      if (photoLocalUri) {
        photoUrl = await uploadAvatar(photoLocalUri);
      }
      await updateProfile({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password ? values.password : undefined,
        address: values.address?.trim() || null,
        phone: values.phone?.trim() || null,
        city: values.city?.trim() || null,
        photoUrl,
      });
      setProfileOpen(false);
      setPhotoLocalUri(null);
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <AppScreen>
      <AppHeader title={t('settings.title')} />

      <SectionHeader title={t('settings.profile')} />
      <AppCard>
        <ListItem
          title={user?.name ?? 'Admin'}
          subtitle={user?.email ?? ''}
          icon={user?.photoUrl ? undefined : "person"}
          left={user?.photoUrl ? <Image source={{ uri: buildAvatarUrl(user.photoUrl) }} style={styles.avatar} /> : undefined}
          chevron
          onPress={() => setProfileOpen(true)}
        />
        <AppText variant="caption" style={styles.role}>
          {t('settings.role', { role: user?.role ?? 'admin' })}
        </AppText>
      </AppCard>

      <SectionHeader title={t('settings.appearance')} />
      <AppCard padded={false}>
        <View style={styles.cardBody}>
          <AppSegmentedControl
            label={t('settings.theme')}
            value={mode}
            options={themeOptions}
            onChange={(value) => setMode(value as ThemeMode)}
          />
        </View>
      </AppCard>

      <SectionHeader title={t('settings.language')} />
      <AppCard padded={false}>
        <View style={styles.cardBody}>
          <AppSegmentedControl
            label={t('settings.language')}
            value={language}
            options={LANGUAGE_OPTIONS}
            onChange={(value) => setLanguage(value as Language)}
          />
        </View>
      </AppCard>

      <SectionHeader
        title={t('settings.gameTypes')}
        actionLabel={t('common.add')}
        onAction={() => router.push('/game-type/new')}
      />
      <AppCard padded={false}>
        {(gameTypes?.items ?? []).map((gameType) => (
          <ListItem
            key={gameType.id}
            title={gameType.name}
            subtitle={`${gameType.holeCards} hole cards • ${gameType.communityCards} community cards`}
            icon="layers"
            chevron
            onPress={() => router.push(`/game-type/${gameType.id}`)}
          />
        ))}
      </AppCard>

      <SectionHeader title={t('settings.session')} />
      <AppButton
        title={t('settings.signOut')}
        variant="danger"
        icon="log-out-outline"
        fullWidth
        onPress={() => setConfirmLogout(true)}
      />

      <AppText variant="caption" center style={styles.version}>
        {t('settings.version')}
      </AppText>

      <AppModal
        visible={profileOpen}
        title={t('settings.editProfile')}
        onClose={() => setProfileOpen(false)}
        footer={
          <AppButton
            title={t('common.close')}
            variant="secondary"
            fullWidth
            onPress={() => setProfileOpen(false)}
          />
        }
      >
        {profileOpen ? (
          <AppForm
            schema={profileSchema}
            defaultValues={{
              name: user?.name ?? '',
              email: user?.email ?? '',
              password: '',
              address: user?.address ?? '',
              phone: user?.phone ?? '',
              city: user?.city ?? '',
            }}
            onSubmit={handleUpdateProfile}
          >
            {({ handleSubmit, formState }) => (
              <View>
                <View style={styles.photoContainer}>
                  <Pressable onPress={handlePickImage} style={[styles.photoButton, { borderColor: colors.border }]}>
                    {photoLocalUri || user?.photoUrl ? (
                      <Image
                        source={{ uri: photoLocalUri ?? buildAvatarUrl(user?.photoUrl) }}
                        style={styles.photoPreview}
                      />
                    ) : (
                      <AppText color={colors.primary}>{t('settings.uploadPhoto', 'Upload Photo')}</AppText>
                    )}
                  </Pressable>
                </View>

                <FormTextField name="name" label={t('settings.name')} />
                <FormTextField
                  name="email"
                  label={t('settings.email')}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <FormTextField
                  name="address"
                  label={t('settings.address')}
                  placeholder={t('settings.venueHint')}
                  autoCapitalize="words"
                />
                <FormTextField name="city" label={t('settings.city')} autoCapitalize="words" />
                <FormTextField name="phone" label={t('settings.phone')} keyboardType="phone-pad" />
                <FormTextField
                  name="password"
                  label={t('settings.newPassword')}
                  secureTextEntry
                  placeholder={t('settings.passwordHint')}
                />
                {serverError ? (
                  <AppText variant="caption" color={colors.danger}>
                    {serverError}
                  </AppText>
                ) : null}
                <AppButton
                  title={t('common.saveChanges')}
                  onPress={handleSubmit(handleUpdateProfile)}
                  loading={formState.isSubmitting}
                  fullWidth
                />
              </View>
            )}
          </AppForm>
        ) : null}
      </AppModal>

      <ConfirmModal
        visible={confirmLogout}
        title={t('settings.signOut')}
        message={t('settings.confirmSignOut')}
        confirmLabel={t('settings.signOut')}
        destructive
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  role: { marginLeft: 12, marginTop: -4 },
  cardBody: { padding: 16 },
  version: { marginTop: 24 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  photoContainer: { alignItems: 'center', marginBottom: 20 },
  photoButton: { width: 100, height: 100, borderRadius: 50, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  photoPreview: { width: '100%', height: '100%' },
});