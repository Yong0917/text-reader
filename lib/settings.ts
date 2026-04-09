export type Theme = 'light' | 'dark' | 'sepia';
export type FontFamily = 'gothic' | 'serif';

export interface Settings {
  fontSize: number;
  theme: Theme;
  fontFamily: FontFamily;
  lineHeight: number;
}

const DEFAULT_SETTINGS: Settings = {
  fontSize: 17,
  theme: 'light',
  fontFamily: 'gothic',
  lineHeight: 1.8,
};

const STORAGE_KEY = 'text-reader-settings';

export function getSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export interface ThemeStyle {
  bg: string;
  bgVar: string;        // CSS variable value for gradients
  text: string;
  subtext: string;
  panel: string;
  panelSolid: string;   // non-blur version for some contexts
  border: string;
  inputBg: string;
  accentText: string;
  handle: string;
}

export const THEME_STYLES: Record<Theme, ThemeStyle> = {
  light: {
    bg: 'bg-[#f8f5ef]',
    bgVar: '#f8f5ef',
    text: 'text-[#1a1714]',
    subtext: 'text-[#7a7068]',
    panel: 'bg-white/90 backdrop-blur-xl',
    panelSolid: 'bg-white',
    border: 'border-[#e8e2d6]',
    inputBg: 'bg-[#f0ece4]',
    accentText: 'text-[#2c5f4e]',
    handle: 'bg-[#d8d0c4]',
  },
  dark: {
    bg: 'bg-[#100e0c]',
    bgVar: '#100e0c',
    text: 'text-[#ede8e0]',
    subtext: 'text-[#8a8278]',
    panel: 'bg-[#1c1916]/92 backdrop-blur-xl',
    panelSolid: 'bg-[#1c1916]',
    border: 'border-[#2d2924]',
    inputBg: 'bg-[#2a2520]',
    accentText: 'text-[#6dbda5]',
    handle: 'bg-[#3a3530]',
  },
  sepia: {
    bg: 'bg-[#f2e8d4]',
    bgVar: '#f2e8d4',
    text: 'text-[#3a2e1e]',
    subtext: 'text-[#7a6a54]',
    panel: 'bg-[#ede0c6]/92 backdrop-blur-xl',
    panelSolid: 'bg-[#ede0c6]',
    border: 'border-[#c8b090]',
    inputBg: 'bg-[#e8d8b8]',
    accentText: 'text-[#7a5a2a]',
    handle: 'bg-[#c0a878]',
  },
};
