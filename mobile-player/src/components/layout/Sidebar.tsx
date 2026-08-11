import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { API_URL } from '@/api/config';
import { AppText } from '@/components/ui/AppText';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

const SERVER_BASE = API_URL.replace(/\/api$/, '');
function buildAvatarUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${SERVER_BASE}${path}`;
}

interface SidebarItemDef {
  key: string;
  label: string;
  path: string;
  icon: keyof typeof Ionicons.glyphMap;
  chip?: 'aa';
}

/**
 * Menú lateral (drawer) global: permite escalar la navegación sin saturar la barra
 * de pestañas. Se renderiza en un Modal para garantizar que quede por encima de
 * la navegación nativa en cualquier pantalla.
 */
export function Sidebar({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const sidebarWidth = Math.min(Math.round(width * 0.82), 320);

  // El Modal se desmonta al terminar la animación de salida (200ms) para poder
  // reproducir el cierre animado.
  const [mounted, setMounted] = useState(visible);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const translateX = useRef(new Animated.Value(-sidebarWidth)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else if (mounted) {
      const timer = setTimeout(() => setMounted(false), 220);
      return () => clearTimeout(timer);
    }
  }, [visible, mounted]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: visible ? 0 : -sidebarWidth,
        duration: visible ? 260 : 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 260 : 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, sidebarWidth, translateX, backdropOpacity]);

  if (!mounted) return null;

  const go = (path: string) => {
    onClose();
    router.navigate(path);
  };

  const handleLogout = async () => {
    await logout();
    setLogoutConfirm(false);
    onClose();
  };

  const isActive = (path: string) => (path === '/' ? pathname === '/' : pathname === path);

  const mainItems: SidebarItemDef[] = [
    { key: 'home', label: t('tabs.home'), path: '/', icon: 'home' },
    { key: 'calendar', label: t('calendar.title'), path: '/calendar', icon: 'calendar' },
    { key: 'tournaments', label: t('tabs.tournaments'), path: '/tournaments', icon: 'trophy' },
    { key: 'tables', label: t('tabs.tables'), path: '/tables', icon: 'grid' },
  ];
  const isDealer = user?.role === 'dealer';
  const moreItems: SidebarItemDef[] = [
    ...(isDealer
      ? [{ key: 'dealer', label: t('dealer.title'), path: '/dealer', icon: 'shuffle' as const }]
      : []),
    { key: 'clubs', label: t('tabs.clubs'), path: '/clubs', icon: 'business' },
    { key: 'profile', label: t('tabs.profile'), path: '/profile', icon: 'person' },
  ];

  return (

    <>
      <Modal transparent statusBarTranslucent animationType="none" visible onRequestClose={onClose}>
        <View style={styles.root}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: backdropOpacity }]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>

          <Animated.View
            style={[
              styles.panel,
              {
                width: sidebarWidth,
                backgroundColor: colors.surface,
                borderRightColor: colors.border,
                transform: [{ translateX }],
              },
            ]}
          >
            <View style={styles.brandRow}>
              <View style={[styles.logo, { backgroundColor: colors.primary }]}>
                <AppText variant="caption" weight="bold" color={colors.onPrimary}>
                  AA
                </AppText>
              </View>
              <AppText variant="title" color={colors.primary}>
                PokeLAP
              </AppText>
            </View>

            <View style={styles.brandSuits}>
              {['♠', '♥', '♦', '♣'].map((suit, i) => (
                <AppText key={suit} variant="caption" color={i % 2 === 0 ? colors.textMuted : colors.danger}>
                  {suit}
                </AppText>
              ))}
            </View>

            <Pressable style={[styles.userCard, { backgroundColor: colors.surfaceMuted }]} onPress={() => go('/profile')}>
              {user?.photoUrl ? (
                <Image source={{ uri: buildAvatarUrl(user.photoUrl) }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primaryMuted }]}>
                  <Ionicons name="person" size={22} color={colors.primary} />
                </View>
              )}
              <View style={styles.userInfo}>
                <AppText variant="body" weight="semibold" numberOfLines={1}>
                  {user?.name ?? '…'}
                </AppText>
                {user?.alias ? (
                  <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
                    @{user.alias}
                  </AppText>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <AppText variant="label" style={styles.sectionLabel}>
                {t('sidebar.sectionMain')}
              </AppText>
              {mainItems.map((item) => (
                <SidebarItemRow
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  chip={item.chip}
                  active={isActive(item.path)}
                  onPress={() => go(item.path)}
                />
              ))}

              <AppText variant="label" style={styles.sectionLabel}>
                {t('sidebar.sectionMore')}
              </AppText>
              {moreItems.map((item) => (
                <SidebarItemRow
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  chip={item.chip}
                  active={isActive(item.path)}
                  onPress={() => go(item.path)}
                />
              ))}
            </ScrollView>

            <Pressable
              style={({ pressed }) => [styles.logoutRow, pressed && { opacity: 0.7 }]}
              onPress={() => setLogoutConfirm(true)}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <AppText variant="body" weight="medium" color={colors.danger}>
                {t('common.logout')}
              </AppText>
            </Pressable>
          </Animated.View>
        </View>

      </Modal>

      <ConfirmModal
        visible={logoutConfirm}
        title={t('common.logout')}
        message={t('profile.logoutConfirm')}
        confirmLabel={t('common.logout')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => void handleLogout()}
        onCancel={() => setLogoutConfirm(false)}
      />
    </>
  );
}

function SidebarItemRow({
  icon,
  label,
  active,
  chip,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  chip?: 'aa';
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: active ? colors.primaryMuted : pressed ? colors.surfaceMuted : 'transparent',
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={active ? colors.primary : colors.textSecondary} />
      <AppText
        variant="body"
        weight={active ? 'semibold' : 'regular'}
        color={active ? colors.primary : colors.textPrimary}
        style={styles.itemLabel}
        numberOfLines={1}
      >
        {label}
      </AppText>
      {chip === 'aa' ? (
        <View style={[styles.aaChip, { borderColor: colors.primary, backgroundColor: colors.primaryMuted }]}>
          <AppText variant="caption" weight="semibold" color={colors.primary}>
            AA
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 16,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  brandSuits: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: spacing.lg },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '6deg' }],
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  userInfo: { flex: 1, gap: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.md },
  sectionLabel: {
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: spacing.sm,
    marginBottom: 2,
  },
  itemLabel: { flex: 1 },
  aaChip: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
});

