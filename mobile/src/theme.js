// CineMatch — Design Tokens
// Tüm ekranlar bu dosyadan import eder, renk/spacing değişimi tek noktadan yapılır

export const Colors = {
  // Zemin
  bg: '#0a0a0f',
  bgCard: '#12121e',
  bgElevated: '#1a1a2a',
  bgInput: 'rgba(255,255,255,0.04)',

  // Vurgu
  red: '#c8102e',
  redDim: 'rgba(200,16,46,0.12)',
  redBorder: 'rgba(200,16,46,0.35)',
  redGlow: 'rgba(200,16,46,0.25)',

  // Metin
  textPrimary: '#ffffff',
  textSecondary: '#888898',
  textMuted: '#44445a',
  textHint: '#333345',

  // Sınırlar
  border: '#1e1e2e',
  borderDim: '#14141e',

  // Durum renkleri
  green: '#00c864',
  greenDim: 'rgba(0,200,100,0.12)',
  gold: '#f0b429',
  goldDim: 'rgba(240,180,41,0.12)',
};

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  card: 20,
  pill: 100,
};

export const Typography = {
  heroTitle: { fontSize: 34, fontWeight: '800', letterSpacing: -1, color: Colors.textPrimary },
  screenTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: Colors.textPrimary },
  cardTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, color: Colors.textPrimary },
  bodyLg: { fontSize: 15, color: Colors.textPrimary },
  body: { fontSize: 14, color: Colors.textPrimary },
  caption: { fontSize: 12, color: Colors.textSecondary },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: Colors.textMuted },
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  red: {
    shadowColor: '#c8102e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
};
