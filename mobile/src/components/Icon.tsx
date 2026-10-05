import React from "react";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";

export type IconName =
  | "home"
  | "home-outline"
  | "search"
  | "search-outline"
  | "cart"
  | "cart-outline"
  | "receipt"
  | "receipt-outline"
  | "person"
  | "person-outline"
  | "location"
  | "location-outline"
  | "star"
  | "star-half"
  | "star-outline"
  | "chevron-back"
  | "chevron-forward"
  | "chevron-down"
  | "close"
  | "add"
  | "remove"
  | "trash-outline"
  | "call"
  | "camera"
  | "image"
  | "leaf"
  | "leaf-outline"
  | "filter"
  | "checkmark-circle"
  | "time-outline"
  | "boat-outline"
  | "car-outline"
  | "cash-outline"
  | "card-outline"
  | "wallet-outline"
  | "create-outline"
  | "shield-checkmark-outline"
  | "pricetag"
  | "pricetag-outline"
  | "options"
  | "arrow-forward"
  | "sparkles"
  | "storefront"
  | "trending-down"
  | "alert-circle"
  | "in_transit"
  | "preparing"
  | "delivered"
  | "confirmed";

interface IconProps {
  name: IconName | string;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 20, color = "#1E293B" }: IconProps) {
  // Manejo de mapeo dinámico de categorías o nombres custom
  const ioniconName = mapIconName(name);

  if (ioniconName.startsWith("mci:")) {
    const mciName = ioniconName.replace("mci:", "");
    return <MaterialCommunityIcons name={mciName as never} size={size} color={color} />;
  }

  if (ioniconName.startsWith("feather:")) {
    const featherName = ioniconName.replace("feather:", "");
    return <Feather name={featherName as never} size={size} color={color} />;
  }

  return <Ionicons name={ioniconName as never} size={size} color={color} />;
}

function mapIconName(name: string): string {
  const clean = name.trim().toLowerCase();

  // Mapeo por emojis o texto de categorías existentes en la DB
  if (clean.includes("tubérculo") || clean.includes("papa") || clean.includes("🥔") || clean === "tuberculos") {
    return "mci:potato";
  }
  if (clean.includes("hortaliza") || clean.includes("verdura") || clean.includes("🥦") || clean.includes("🥕") || clean === "hortalizas") {
    return "mci:carrot";
  }
  if (clean.includes("fruta") || clean.includes("🍎") || clean.includes("🍓") || clean === "frutas") {
    return "mci:fruit-cherries";
  }
  if (clean.includes("lácteo") || clean.includes("queso") || clean.includes("leche") || clean.includes("🧀") || clean.includes("🥛")) {
    return "mci:cheese";
  }
  if (clean.includes("grano") || clean.includes("frijol") || clean.includes("🌾") || clean.includes("🫘")) {
    return "mci:barley";
  }
  if (clean.includes("huevo") || clean.includes("pollo") || clean.includes("🥚") || clean.includes("🐔")) {
    return "mci:egg";
  }
  if (clean.includes("procesado") || clean.includes("mermelada") || clean.includes("🍯")) {
    return "mci:jar";
  }

  // Iconos por defecto de estado / navegación
  switch (clean) {
    case "confirmed":
    case "✓":
      return "checkmark-circle";
    case "preparing":
    case "👨‍🌾":
      return "mci:account-cowboy-hat";
    case "in_transit":
    case "🚚":
      return "mci:truck-delivery";
    case "delivered":
    case "🏠":
      return "home";
    case "surplus":
    case "⚡":
    case "🔥":
      return "sparkles";
    default:
      return name;
  }
}
