import { useColorScheme } from "react-native";
import { colors, ThemeColors } from "./tokens";

export * from "./tokens";

export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === "dark" ? colors.dark : colors.light;
}

export function formatCOP(cents: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents);
}
