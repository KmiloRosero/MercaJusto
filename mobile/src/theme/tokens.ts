// Port 1:1 de css/global.css a tokens de React Native.
// Usa useColorScheme() de React Native para alternar entre light y dark.

type ColorTokens = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primary10: string;
  accent: string;
  accentDark: string;
  accentLight: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  gray50: string;
  gray100: string;
  gray200: string;
  gray300: string;
  gray400: string;
  gray500: string;
  gray600: string;
  gray700: string;
  gray800: string;
  gray900: string;
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  bgInput: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  border: string;
  borderFocus: string;
};

export const colors: { light: ColorTokens; dark: ColorTokens } = {
  light: {
    primary: "#008FFF",
    primaryDark: "#006FCC",
    primaryLight: "#E6F4FF",
    primary10: "rgba(0,143,255,0.10)",

    accent: "#FF6B2B",
    accentDark: "#E05520",
    accentLight: "#FFF0E9",

    success: "#2DC653",
    warning: "#FFB800",
    danger: "#F03A47",
    info: "#008FFF",

    gray50: "#F8FAFB",
    gray100: "#F0F2F5",
    gray200: "#E2E6EA",
    gray300: "#CBD0D8",
    gray400: "#9BA3AD",
    gray500: "#6B7280",
    gray600: "#4B5563",
    gray700: "#374151",
    gray800: "#1F2937",
    gray900: "#111827",

    bgPrimary: "#FFFFFF",
    bgSecondary: "#F4F6F8",
    bgCard: "#FFFFFF",
    bgInput: "#F4F6F8",

    textPrimary: "#111827",
    textSecondary: "#6B7280",
    textTertiary: "#9BA3AD",
    textInverse: "#FFFFFF",

    border: "#E2E6EA",
    borderFocus: "#008FFF",
  },
  dark: {
    primary: "#008FFF",
    primaryDark: "#006FCC",
    primaryLight: "#0D2035",
    primary10: "rgba(0,143,255,0.15)",

    accent: "#FF6B2B",
    accentDark: "#E05520",
    accentLight: "#2A1A0E",

    success: "#2DC653",
    warning: "#FFB800",
    danger: "#F03A47",
    info: "#008FFF",

    gray50: "#0B0F14",
    gray100: "#12181F",
    gray200: "#1E262F",
    gray300: "#30363D",
    gray400: "#6E7681",
    gray500: "#8B949E",
    gray600: "#B0B8C1",
    gray700: "#C9D1D9",
    gray800: "#E6EDF3",
    gray900: "#F0F6FC",

    bgPrimary: "#0D1117",
    bgSecondary: "#161B22",
    bgCard: "#1C2330",
    bgInput: "#21283A",

    textPrimary: "#E6EDF3",
    textSecondary: "#8B949E",
    textTertiary: "#6E7681",
    textInverse: "#0D1117",

    border: "#30363D",
    borderFocus: "#008FFF",
  },
};

export type ThemeColors = ColorTokens;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
} as const;

export const fontWeight = {
  light: "300",
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
} as const;

export const shadow = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export const nav = {
  bottomHeight: 64,
  topbarHeight: 56,
} as const;
