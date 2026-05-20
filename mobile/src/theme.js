// src/theme.js

// 1. Sabit Temel Renk Paletleri
const lightColors = {
  bg: '#f8f9fa',
  bgSoft: '#ffffff',
  glass: 'rgba(0,0,0,0.03)',
  glassStrong: 'rgba(0,0,0,0.06)',
  border: 'rgba(0,0,0,0.08)',
  borderSoft: 'rgba(0,0,0,0.04)',
  
  red: '#ff3b55',
  redSoft: 'rgba(255,59,85,0.1)',
  redBorder: 'rgba(255,59,85,0.2)',
  purple: '#8a46ff',
  purpleSoft: 'rgba(138,70,255,0.08)',
  purpleBorder: 'rgba(138,70,255,0.15)',
  gold: '#f0b429',
  success: '#20c997',

  textPrimary: '#121214',
  textSecondary: '#495057',
  textMuted: '#adb5bd',
};

const darkColors = {
  bg: '#050506',
  bgSoft: '#0B0B10',
  glass: 'rgba(255,255,255,0.06)',
  glassStrong: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.10)',
  borderSoft: 'rgba(255,255,255,0.06)',
  
  red: '#ff3b55',
  redSoft: 'rgba(255,59,85,0.15)',
  redBorder: 'rgba(255,59,85,0.35)',
  purple: '#9b5cff',
  purpleSoft: 'rgba(155,92,255,0.15)',
  purpleBorder: 'rgba(155,92,255,0.30)',
  gold: '#f8c84a',
  success: '#27c46b',

  textPrimary: '#ffffff',
  textSecondary: '#b9b8c7',
  textMuted: '#737286',
};

// 2. Projedeki Eski Import'ların Patlamaması İçin Varsayılan Sabit (Default Dark)
export const Colors = darkColors;

// 3. Modlar Arası Dinamik Geçiş İçin Temalar
export const lightTheme = { ...lightColors };
export const darkTheme = { ...darkColors };

// 4. Kenar Yumuşatma Ayarları
export const Radii = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  max: 9999,
};

// 5. Statik Gölgeler (Eski sayfaların patlamaması için varsayılan Colors'ı referans alır)
export const Shadows = {
  purple: {
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  red: {
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
};

// 6. Dinamik Gölgeler (Yeni kuracağın ThemeContext içinde kullanmak istersen)
export const getShadows = (activeTheme) => ({
  purple: {
    shadowColor: activeTheme.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  red: {
    shadowColor: activeTheme.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
});