// Design system — warm stone palette (matches SafeNest concept)
export const C = {
  bg:      '#fafaf9', // ink-50
  ink100:  '#f5f5f4',
  ink200:  '#e7e5e4',
  ink300:  '#d6d3d1',
  ink400:  '#a8a29e',
  ink500:  '#78716c',
  ink600:  '#57534e',
  ink700:  '#44403c',
  ink800:  '#292524',
  ink900:  '#1c1917', // primary text / dark elements
  teal:    '#0d9488', // ac-500 — active/accent
  tealDk:  '#0f766e',
  border:  '#f0eeec', // card border (lighter warm white)
  red:     '#E11D48',
  amber:   '#D97706',
} as const;

export const CARD = {
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#f0eeec',
  borderRadius: 20,
} as const;

export const SERIF = 'CormorantGaramond_700Bold_Italic';

export const LABEL: object = {
  fontSize: 10,
  fontWeight: '600',
  color: '#a8a29e',
  letterSpacing: 1.5,
  textTransform: 'uppercase',
};

// Legacy color aliases (used by older screens not yet redesigned)
export const colors = {
  primary: '#1c1917',
  primaryLight: '#f5f5f4',
  secondary: '#0d9488',
  secondaryLight: '#ccfbf1',
  danger: '#E11D48',
  dangerLight: '#FFE4E6',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  background: '#fafaf9',
  surface: '#FFFFFF',
  text: '#1c1917',
  textSecondary: '#78716c',
  textMuted: '#a8a29e',
  border: '#e7e5e4',
  white: '#FFFFFF',
  black: '#000000',
};
