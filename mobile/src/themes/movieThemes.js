// src/themes/movieThemes.js
// Film bazlı temalar — backgroundImage null = renk gradyanı kullan

export const movieThemes = {
  dune: {
  id: 'dune',

  name: 'Dune',
  emoji: '🏜️',

  backgroundImage: require('../../assets/dune-bg.png'),
  matchmakingBackgroundImage: require('../../assets/dune-bg1.png'),

  colors: {
    // ── Core Palette ──
    primary: '#C19A6B',
    primarySoft: 'rgba(193,154,107,0.15)',
    primaryBorder: 'rgba(193,154,107,0.30)',

    spice: '#D89A3A',
    spiceSoft: 'rgba(216,154,58,0.14)',

    sand: '#A66A2A',
    sandSoft: 'rgba(166,106,42,0.14)',

    gold: '#F0B45A',
    bronze: '#8A5A2B',

    // ── Backgrounds ──
    bg: '#050403',
    bgSoft: '#120B04',
    bgElevated: '#1B1208',

    shadow: 'rgba(0,0,0,0.72)',

    // ── Glass / Surfaces ──
    glass: 'rgba(193,154,107,0.07)',
    glassStrong: 'rgba(193,154,107,0.13)',

    surface: 'rgba(20,12,5,0.82)',
    surfaceSoft: 'rgba(28,18,8,0.72)',

    // ── Borders ──
    border: 'rgba(193,154,107,0.15)',
    borderSoft: 'rgba(193,154,107,0.08)',
    borderStrong: 'rgba(193,154,107,0.24)',

    // ── Text ──
    textPrimary: '#F7E4BD',
    textSecondary: '#C7A77A',
    textMuted: '#7A6040',
    textDim: '#5A4731',

    // ── Accent States ──
    red: '#D9822B',
    redSoft: 'rgba(217,130,43,0.16)',

    success: '#BFA45A',
    warning: '#E0AD62',

    // ── Ambient ──
    ambientGlow: 'rgba(216,154,58,0.22)',
    ambientSoft: 'rgba(193,154,107,0.10)',
  },

  // ── Theme Icons ──
  icons: {
    add: '✦',
    like: '◈',
    activeDot: '•',
    section: '◆',

    discover: '✦',
    search: '◉',
    collections: '⟁',
    profile: '⌘',
    match: '◈',
  },

  // ── Theme Labels ──
  labels: {
    match: 'resonance',
    watchlist: 'archives',
    discover: 'visions',
  },

  // ── Navbar ──
  navbar: {
    background: 'rgba(10,6,2,0.84)',
    border: 'rgba(193,154,107,0.10)',
    gradient: ['rgba(18,11,4,0.96)', 'rgba(49,30,9,0.94)'],

    active: '#F0B45A',
    inactive: 'rgba(247,228,189,0.35)',
    activePill: 'rgba(216,154,58,0.16)',
    activeBorder: 'rgba(240,180,90,0.28)',

    glow: 'rgba(240,180,90,0.35)',

    activeDot: {
      size: 4,
      color: '#F0B45A',
      glow: 'rgba(240,180,90,0.9)',
    },
  },

  // ── Card Styling ──
  cards: {
    radius: 22,

    borderColor: 'rgba(216,154,58,0.14)',

    shadowColor: '#D89A3A',
    shadowOpacity: 0.18,
    shadowRadius: 20,

    glass: 'rgba(193,154,107,0.06)',
  },

  // ── Typography ──
  typography: {
    heroLetterSpacing: 0.5,

    titleLetterSpacing: 2.5,

    sectionLetterSpacing: 1.2,

    uppercaseSpacing: 4,
  },

  // ── Effects ──
  effects: {
    grain: true,
    dustParticles: true,
    vignette: true,

    heatGlow: 'rgba(217,130,43,0.10)',
    spiceGlow: 'rgba(240,180,90,0.18)',
  },

  // ── Gradient ──
  gradient: [
    '#050403',
    '#120B04',
    '#2A1A08',
  ],
},

  oppenheimer: {
    id: 'oppenheimer',
    name: 'Oppenheimer',
    emoji: '☢️',
    backgroundImage: null,
    colors: {
      primary: '#FF6B00',
      primarySoft: 'rgba(255,107,0,0.15)',
      primaryBorder: 'rgba(255,107,0,0.3)',
      bg: '#080400',
      bgSoft: '#130900',
      glass: 'rgba(255,107,0,0.07)',
      glassStrong: 'rgba(255,107,0,0.13)',
      border: 'rgba(255,107,0,0.15)',
      borderSoft: 'rgba(255,107,0,0.08)',
      textPrimary: '#FFE0C0',
      textSecondary: '#d4956a',
      textMuted: '#7a4f30',
      gold: '#FF6B00',
      red: '#ff3b55',
      redSoft: 'rgba(255,59,85,0.15)',
      success: '#20c997',
    },
    gradient: ['#080400', '#130900', '#1f0e00'],
  },

  matrix: {
    id: 'matrix',
    name: 'The Matrix',
    emoji: '💊',
    backgroundImage: null,
    colors: {
      primary: '#00FF41',
      primarySoft: 'rgba(0,255,65,0.1)',
      primaryBorder: 'rgba(0,255,65,0.25)',
      bg: '#000000',
      bgSoft: '#010D00',
      glass: 'rgba(0,255,65,0.06)',
      glassStrong: 'rgba(0,255,65,0.11)',
      border: 'rgba(0,255,65,0.12)',
      borderSoft: 'rgba(0,255,65,0.06)',
      textPrimary: '#00FF41',
      textSecondary: '#00cc33',
      textMuted: '#006617',
      gold: '#00FF41',
      red: '#ff3b55',
      redSoft: 'rgba(255,59,85,0.15)',
      success: '#00FF41',
    },
    gradient: ['#000000', '#010D00', '#001a00'],
  },

  interstellar: {
    id: 'interstellar',
    name: 'Interstellar',
    emoji: '🌌',
    backgroundImage: null,
    colors: {
      primary: '#4FC3F7',
      primarySoft: 'rgba(79,195,247,0.12)',
      primaryBorder: 'rgba(79,195,247,0.25)',
      bg: '#00000A',
      bgSoft: '#020818',
      glass: 'rgba(79,195,247,0.07)',
      glassStrong: 'rgba(79,195,247,0.13)',
      border: 'rgba(79,195,247,0.15)',
      borderSoft: 'rgba(79,195,247,0.07)',
      textPrimary: '#E3F6FF',
      textSecondary: '#90CAF9',
      textMuted: '#3a6080',
      gold: '#FFD54F',
      red: '#ff3b55',
      redSoft: 'rgba(255,59,85,0.15)',
      success: '#4FC3F7',
    },
    gradient: ['#00000A', '#020818', '#030d24'],
  },
};

// Tema listesi — UI'da sıralı gösterim için
export const movieThemeList = Object.values(movieThemes);
