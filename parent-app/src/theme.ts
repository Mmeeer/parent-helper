// SafeNest Design System — colorful cheerful palette
export const C = {
  // Background
  bg: '#fafbfe',

  // Nest (primary blue)
  nest50: '#f0f7ff',
  nest100: '#dfeeff',
  nest200: '#b8dcff',
  nest300: '#79c0ff',
  nest400: '#3a9eff',
  nest500: '#0b7aed',
  nest600: '#005fcb',

  // Warm (orange)
  warm50: '#fffbf5',
  warm100: '#fff4e6',
  warm400: '#ffb86c',
  warm500: '#ff9f43',
  warm600: '#e8842a',

  // Safe (green)
  safe50: '#f0fdf4',
  safe100: '#dcfce7',
  safe400: '#34d46f',
  safe500: '#16b650',
  safe600: '#0e9240',

  // Danger (red)
  danger50: '#fff5f5',
  danger100: '#ffe0e0',
  danger400: '#ff6b6b',
  danger500: '#ff4757',
  danger600: '#e63946',

  // Grays
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',

  // Aliases
  white: '#ffffff',
  border: '#f3f4f6',
} as const;

// Card: white bg, rounded-3xl (24), shadow-sm, border-gray-100
export const CARD = {
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#f3f4f6',
  borderRadius: 24,
} as const;

// Section label style (e.g. "PENDING (2)", "NOTIFICATIONS")
export const SECTION_LABEL: object = {
  fontSize: 12,
  fontWeight: '700',
  color: '#9ca3af',
  letterSpacing: 0.5,
};

/** @deprecated Use SECTION_LABEL instead */
export const LABEL = SECTION_LABEL;
