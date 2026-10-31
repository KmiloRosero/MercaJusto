import React from "react";
import { Image, ImageStyle, View, ViewStyle } from "react-native";
import { sizedImage } from "../lib/image";
import { Category } from "../api/types";
import { useFieldColor } from "../theme";
import { Icon } from "./Icon";

/**
 * Ícono propio de algunos productos cuando el de su categoría confunde
 * (huevos y leche no son queso, el lulo no es una cereza).
 */
function productGlyph(name?: string): string | null {
  const n = (name ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (!n) return null;
  if (n.includes("huevo")) return "mci:egg";
  if (n.includes("leche")) return "mci:bottle-tonic-outline";
  if (n.includes("queso")) return "mci:cheese";
  if (n.includes("lulo") || n.includes("naranja") || n.includes("mandarina")) return "mci:fruit-citrus";
  // Sin un dibujo fiel, una canasta neutra en vez de otra fruta.
  if (n.includes("platano") || n.includes("banano") || n.includes("maracuya") || n.includes("remolacha")) {
    return "mci:basket-outline";
  }
  if (n.includes("zanahoria")) return "mci:carrot";
  if (n.includes("cebolla") || n.includes("cilantro") || n.includes("albahaca") || n.includes("hierbabuena")) {
    return "mci:sprout";
  }
  if (n.includes("arroz")) return "mci:rice";
  if (n.includes("cafe")) return "mci:coffee";
  return null;
}

interface FieldTileProps {
  category?: Category | null;
  /** Nombre del producto: afina el ícono cuando el de la categoría no le corresponde. */
  productName?: string;
  /** Foto que subió el productor; si hay, se muestra en vez del ícono. */
  photoUrl?: string | null;
  /** Lado del cuadro. Si se omite, ocupa todo el contenedor. */
  size?: number;
  iconSize: number;
  radius?: number;
  style?: ViewStyle;
}

/**
 * Miniatura de producto: la foto del productor si la subió; si no, el ícono
 * de su categoría sobre el color del campo que la cultiva (la "colcha de
 * retazos" de Nariño).
 */
export function FieldTile({ category, productName, photoUrl, size, iconSize, radius = 12, style }: FieldTileProps) {
  const field = useFieldColor(category);
  if (photoUrl) {
    return (
      <Image
        source={{ uri: sizedImage(photoUrl, size ?? 160, 1) }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        style={[size ? { width: size, height: size } : { width: "100%", height: "100%" }, { borderRadius: radius, backgroundColor: field.ground }, style as ImageStyle]}
      />
    );
  }
  return (
    <View
      style={[
        size ? { width: size, height: size } : { width: "100%", height: "100%" },
        {
          borderRadius: radius,
          backgroundColor: field.ground,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Icon name={productGlyph(productName) ?? (category?.name || "leaf")} size={iconSize} color={field.ink} />
    </View>
  );
}
