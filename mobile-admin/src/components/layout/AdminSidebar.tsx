import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from '@/hooks/use-auth';
import { useAdminSidebar } from '@/hooks/use-sidebar';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';

interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/** Menú lateral (drawer) del admin para navegar entre módulos. */
export function AdminSidebar() {
  const { visible, close } = useAdminSidebar();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user, logout } = useAuth();

  const items: NavItem[] = [
    { key: 'home', label: t('tabs.home'), path: '/', icon: 'home' },
    { key: 'tables', label: t('tabs.tables'), path: '/tables', icon: 'grid' },
    { key: 'tournaments', label: t('tabs.tournaments'), path: '/tournaments', icon: 'trophy' },
    { key: 'chips', label: t('tabs.chips'), path: '/chips', icon: 'albums' },
    { key: 'collaborators', label: t('settings.collaborators'), path: '/collaborators', icon: 'people' },
    { key: 'settings', label: t('tabs.settings'), path: '/settings', icon: 'settings' },
  ];

  const go = (path: string) => {
    close();
    router.navigate(path);
  };

  const handleLogout = async () => {
    close();
    await logout();
    router.replace('/login');
  };

  return (
    <Modal transparent statusBarTranslucent visible={visible} onRequestClose={close} animationType="none">
      <View style={styles.root}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={close} />
        <View style={[styles.panel, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
          <View style={styles.brandRow}>
            <View style={[styles.logo, { backgroundColor: colors.primary }]}>
              <AppText variant="caption" weight="bold" color={colors.onPrimary}>
                AA
              </AppText>
            </View>
            <AppText variant="title" color={colors.primary}>
              PokeLAP Admin
            </AppText>
          </View>

          <ScrollView style={styles.list}>
            {items.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => go(item.path)}
                style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name={item.icon} size={20} color={colors.textPrimary} />
                <AppText variant="body" weight="medium">
                  {item.label}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={handleLogout} style={styles.item}>
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <AppText variant="body" weight="medium" color={colors.danger}>
                {t('settings.signOut')}
              </AppText>
            </Pressable>
            <AppText variant="caption" color={colors.textMuted} style={styles.userLine}>
              {user?.name ?? ''} • {user?.email ?? ''}
            </AppText>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  panel: {
    width: 300,
    maxWidth: '82%',
    paddingTop: 48,
    paddingBottom: 24,
    borderRightWidth: 1,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flex: 1, paddingHorizontal: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  footer: { paddingHorizontal: 20, gap: 8 },
  userLine: { marginTop: 4, paddingHorizontal: 8 },
});
