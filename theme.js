// theme.js - Tema personalizado para React Native Paper
import { MD3LightTheme } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2196F3',
    primaryContainer: '#BBDEFB',
    secondary: '#4CAF50',
    secondaryContainer: '#C8E6C9',
    tertiary: '#FF9800',
    error: '#F44336',
    errorContainer: '#FFCDD2',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    outline: '#E0E0E0',
    outlineVariant: '#EEEEEE',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#1A1C1E',
    onSurface: '#1A1C1E',
    onSurfaceVariant: '#666666',
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#F5F5F5',
      level3: '#EEEEEE',
      level4: '#E0E0E0',
      level5: '#D6D6D6',
    },
  },
  roundness: 12,
};

// Colores adicionales para el diseño
export const colors = {
  success: '#4CAF50',
  warning: '#FF9800',
  info: '#2196F3',
  danger: '#F44336',
  light: '#F5F7FA',
  dark: '#333333',
  muted: '#666666',
  border: '#E0E0E0',
  inputBackground: '#FFFFFF',
  cardShadow: 'rgba(0, 0, 0, 0.08)',
};
