export const palette = {
  light: {
    background: '#F0F2F5', // Slightly darker off-white for better contrast
    surface: '#FFFFFF',
    surfaceMuted: '#E4E7EC',
    border: '#D1D5DB',
    textPrimary: '#111827',
    textSecondary: '#4B5563',
    textMuted: '#9CA3AF',
    primary: '#D4AF37', // Gold
    onPrimary: '#000000', // Black text on gold
    primaryMuted: '#FDF6E3',
    accent: '#0F5132', // Casino Green
    onAccent: '#FFFFFF',
    success: '#1E9E5A',
    successMuted: '#E3F5EC',
    warning: '#D97706',
    warningMuted: '#FDF1E0',
    danger: '#E32636', // Alizarin Red (Cards)
    dangerMuted: '#FDEBEB',
    info: '#0E7490',
    infoMuted: '#E0F2F5',
    overlay: 'rgba(0, 0, 0, 0.5)',
    tabBar: '#FFFFFF',
  },
  dark: {
    background: '#121418', // Deep Charcoal/Black
    surface: '#1A1D24', // Slightly lighter charcoal for cards
    surfaceMuted: '#242830',
    border: '#2A363B', // Subtle gold/green tinted border
    textPrimary: '#F3F4F6',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    primary: '#D4AF37', // Casino Gold
    onPrimary: '#000000', // Black text on gold chips
    primaryMuted: '#2D2411', // Very dark gold hint
    accent: '#0F5132', // Casino Green
    onAccent: '#FFFFFF',
    success: '#34C07A',
    successMuted: '#15301F',
    warning: '#F0A63B',
    warningMuted: '#33270F',
    danger: '#E32636', // Vibrant Playing Card Red
    dangerMuted: '#3A1A1A',
    info: '#4FB6D8',
    infoMuted: '#122C33',
    overlay: 'rgba(0, 0, 0, 0.7)', // Darker overlay for casino vibe
    tabBar: '#0A0B0E', // Very dark for tab bar
  },
} as const;

export type ColorTokens = (typeof palette)['light'];
