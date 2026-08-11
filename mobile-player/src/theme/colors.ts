export const palette = {
  light: {
    background: '#F3EFE6', // Marfil cálido
    surface: '#FFFFFF',
    surfaceMuted: '#EAE4D6',
    border: '#D8CDBB',
    textPrimary: '#201B12',
    textSecondary: '#5A5245',
    textMuted: '#A0947F',
    primary: '#C79A2E', // Dorado casino
    onPrimary: '#1F1705',
    primaryMuted: '#FBF3DD',
    accent: '#0F5132', // Verde fieltro
    onAccent: '#FFFFFF',
    success: '#1E9E5A',
    successMuted: '#E3F5EC',
    warning: '#D97706',
    warningMuted: '#FDF1E0',
    danger: '#C62B3F', // Rojo naipe
    dangerMuted: '#FBE9EC',
    info: '#0E7490',
    infoMuted: '#E0F2F5',
    overlay: 'rgba(28, 24, 12, 0.55)',
    tabBar: '#FFFFFF',
  },
  dark: {
    background: '#0A0C10', // Negro terciopelo
    surface: '#14181F', // Carbón de las cartas
    surfaceMuted: '#20262F',
    border: '#2C3630', // Borde con tinte verde/dorado
    textPrimary: '#F3EDE0', // Marfil
    textSecondary: '#A9A294',
    textMuted: '#6F6A5E',
    primary: '#E3B341', // Dorado brillante
    onPrimary: '#1A1206',
    primaryMuted: '#2F2713', // Dorado muy oscuro
    accent: '#0F5132', // Verde fieltro
    onAccent: '#FFFFFF',
    success: '#38C172',
    successMuted: '#14301F',
    warning: '#F0A63B',
    warningMuted: '#33270F',
    danger: '#E5455B', // Rojo naipe vibrante
    dangerMuted: '#3A1B22',
    info: '#4FB6D8',
    infoMuted: '#122C33',
    overlay: 'rgba(0, 0, 0, 0.74)',
    tabBar: '#0B0E12',
  },
} as const;

export type ColorTokens = (typeof palette)['light'];
