import { useColorScheme } from "react-native";
import { useThemePreference } from "../store/theme";
import { colors, ThemeColors } from "./tokens";

export * from "./tokens";

export function useThemeScheme(): "light" | "dark" {
  const systemScheme = useColorScheme();
  const preference = useThemePreference((state) => state.mode);
  return preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;
}

export function useTheme(): ThemeColors {
  return colors[useThemeScheme()];
}

export function formatCOP(cents: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents);
}
