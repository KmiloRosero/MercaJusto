// Paleta "verde campo nariñense": la colcha de retazos de los cultivos de
// Nariño. Roles al estilo Material 3 (on*, *Container); cada par texto/fondo
// cumple al menos 4,5:1 en claro y en oscuro.

type ColorTokens = {
  /** Acción principal, selección y foco. */
  primary: string;
  /** Texto e íconos sobre `primary`. */
  onPrimary: string;
  primaryDark: string;
  /** Contenedor tonal del primario (chips activos, avisos informativos). */
  primaryLight: string;
  /** Texto sobre `primaryLight`. */
  onPrimaryLight: string;
  primary10: string;
  /** Arcilla: reservado para excedentes y descuentos. */
  accent: string;
  onAccent: string;
  accentDark: string;
  accentLight: string;
  onAccentLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  info: string;
  /** Estrellas de calificación. */
  rating: string;
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
  /** Velo detrás de hojas y diálogos. */
  scrim: string;
  /** Superficie inversa (snackbar). */
  inverseSurface: string;
  onInverseSurface: string;
  /** Acción sobre la superficie inversa (botón del snackbar). */
  inversePrimary: string;
};

export const colors: { light: ColorTokens; dark: ColorTokens } = {
  light: {
    primary: "#1F6B3D",
    onPrimary: "#FFFFFF",
    primaryDark: "#16532F",
    primaryLight: "#D7EBD3",
    onPrimaryLight: "#0F3D21",
    primary10: "rgba(31,107,61,0.10)",

    accent: "#A8501C",
    onAccent: "#FFFFFF",
    accentDark: "#7D3A11",
    accentLight: "#F8E3D3",
    onAccentLight: "#6A2E0B",

    success: "#17703A",
    successLight: "#D7EBD3",
    warning: "#8A5A00",
    warningLight: "#F6E7C2",
    danger: "#B3261E",
    dangerLight: "#F9DEDC",
    info: "#1D5C86",
    rating: "#B7791F",

    gray50: "#F7F8F6",
    gray100: "#F1F2EF",
    gray200: "#E2E5DF",
    gray300: "#BCC5B8",
    gray400: "#5F6B62",
    gray500: "#4A564D",
    gray600: "#3A453D",
    gray700: "#2B352E",
    gray800: "#1E2721",
    gray900: "#17211A",

    // Suelo blanco y pozos grises casi neutros, como las apps de domicilio.
    bgPrimary: "#FFFFFF",
    bgSecondary: "#F4F5F3",
    bgCard: "#FFFFFF",
    bgInput: "#F1F2EF",

    textPrimary: "#17211A",
    textSecondary: "#4A564D",
    textTertiary: "#5F6B62",
    textInverse: "#FFFFFF",

    border: "#E2E5DF",
    borderFocus: "#1F6B3D",
    scrim: "rgba(10,20,14,0.5)",
    inverseSurface: "#26302A",
    onInverseSurface: "#EEF3EC",
    inversePrimary: "#8FD3A1",
  },
  // Oscuro: superficies negras neutras (sin tinte verde) y el verde de la
  // marca, más vivo, solo en acciones, selección y estados.
  dark: {
    primary: "#3DBE72",
    onPrimary: "#03140A",
    primaryDark: "#2FA35F",
    primaryLight: "#0F2E1B",
    onPrimaryLight: "#9BE3B5",
    primary10: "rgba(61,190,114,0.14)",

    accent: "#F2A56E",
    onAccent: "#3A1704",
    accentDark: "#E08A4E",
    accentLight: "#3D200D",
    onAccentLight: "#FFD9BF",

    success: "#3DBE72",
    successLight: "#0F2E1B",
    warning: "#F0C062",
    warningLight: "#33280B",
    danger: "#F2B8B5",
    dangerLight: "#3F1715",
    info: "#9CCBF0",
    rating: "#F0C062",

    gray50: "#0A0A0A",
    gray100: "#121212",
    gray200: "#262626",
    gray300: "#3A3A3A",
    gray400: "#8F8F8F",
    gray500: "#B8B8B8",
    gray600: "#CCCCCC",
    gray700: "#DADADA",
    gray800: "#E6E6E6",
    gray900: "#F2F2F2",

    bgPrimary: "#0E0E0E",
    bgSecondary: "#000000",
    bgCard: "#161616",
    bgInput: "#1E1E1E",

    textPrimary: "#F2F2F2",
    textSecondary: "#B8B8B8",
    textTertiary: "#8F8F8F",
    textInverse: "#0E0E0E",

    border: "#2E2E2E",
    borderFocus: "#3DBE72",
    scrim: "rgba(0,0,0,0.7)",
    inverseSurface: "#F2F2F2",
    onInverseSurface: "#161616",
    inversePrimary: "#1F6B3D",
  },
};

/** Color de campo por categoría: el sello de la colcha de retazos. */
export type FieldColor = { ground: string; ink: string };

export const fields: Record<"light" | "dark", Record<string, FieldColor>> = {
  light: {
    tuberculos: { ground: "#EFE0C8", ink: "#6B4A1A" },
    verduras: { ground: "#D7EBD3", ink: "#1F5A31" },
    frutas: { ground: "#F3D9DC", ink: "#8A2333" },
    granos: { ground: "#F0E4B5", ink: "#5E4A0C" },
    "lacteos-huevos": { ground: "#DCE8F0", ink: "#24506E" },
    "cafe-cacao": { ground: "#E8D9CF", ink: "#5A3420" },
    default: { ground: "#E3E8DE", ink: "#2F4A36" },
  },
  dark: {
    tuberculos: { ground: "#3A2E1B", ink: "#EBCB9A" },
    verduras: { ground: "#1E3D28", ink: "#A9DDB4" },
    frutas: { ground: "#43222A", ink: "#F2B3BE" },
    granos: { ground: "#3A3212", ink: "#E8D27E" },
    "lacteos-huevos": { ground: "#1D3242", ink: "#A8CDE6" },
    "cafe-cacao": { ground: "#38271D", ink: "#E2BFA6" },
    default: { ground: "#1F1F1F", ink: "#C8C8C8" },
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
  /** Dock de pestañas sin el área segura: cápsula de 62 + aire arriba y abajo. */
  bottomHeight: 78,
  /** App bar de Material. */
  topbarHeight: 64,
} as const;

// Escala tipográfica (fuente del sistema). Los tamaños grandes llevan
// tracking negativo para que se vean compactos y nítidos.
export const type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.6 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: -0.4 },
  headline: { fontSize: 18, lineHeight: 24, fontWeight: "700", letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400", letterSpacing: 0 },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: "600", letterSpacing: -0.1 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: "500", letterSpacing: 0 },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: "700", letterSpacing: 0.8 },
} as const;

// Curvas de movimiento: ease-out fuerte para entradas y respuestas.
export const motion = {
  easeOut: [0.23, 1, 0.32, 1] as const,
  easeInOut: [0.77, 0, 0.175, 1] as const,
  // Hojas que suben desde abajo (curva de los drawers de iOS)
  drawer: [0.32, 0.72, 0, 1] as const,
  // Hundimiento al tocar y regreso con resorte, compartidos por todo lo presionable
  pressIn: 120,
  release: { damping: 18, stiffness: 320 },
} as const;
