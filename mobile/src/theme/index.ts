import { useColorScheme } from "react-native";
import { useThemePreference } from "../store/theme";
import { colors, fields, FieldColor, ThemeColors } from "./tokens";

export * from "./tokens";

export function useThemeScheme(): "light" | "dark" {
  const systemScheme = useColorScheme();
  const preference = useThemePreference((state) => state.mode);
  return preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;
}

export function useTheme(): ThemeColors {
  return colors[useThemeScheme()];
}

/** Color de campo de una categoría (por slug o nombre), según el tema. */
export function useFieldColor(category?: { slug?: string; name?: string } | null): FieldColor {
  const palette = fields[useThemeScheme()];
  return fieldFor(palette, category);
}

export function fieldFor(
  palette: Record<string, FieldColor>,
  category?: { slug?: string; name?: string } | null
): FieldColor {
  const key = category?.slug ?? slugify(category?.name ?? "");
  return palette[key] ?? palette.default;
}

function slugify(name: string): string {
  const s = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (s.includes("tuberc")) return "tuberculos";
  if (s.includes("verdura") || s.includes("hortaliza")) return "verduras";
  if (s.includes("fruta")) return "frutas";
  if (s.includes("grano")) return "granos";
  if (s.includes("lacteo") || s.includes("huevo")) return "lacteos-huevos";
  if (s.includes("cafe") || s.includes("cacao")) return "cafe-cacao";
  return "default";
}

export function formatCOP(cents: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents);
}
