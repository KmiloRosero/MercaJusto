import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { LiquidMetalShaderProps } from "./liquidMetal";

export type { LiquidMetalShaderProps } from "./liquidMetal";

/**
 * Versión de celular del fondo de metal líquido: un degradado estático con
 * los mismos colores. El shader WebGL vive en `LiquidMetalShader.web.tsx`;
 * en Android de gama baja no se anima nada de fondo.
 */
export function LiquidMetalShader({
  baseColor = "#1a1a1a",
  metalColor = "#ccd0e2",
  highlightColor = "#ffffff",
  style,
}: LiquidMetalShaderProps) {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ overflow: "hidden", backgroundColor: baseColor }, style]}>
      {/* Pliegues del metal: dos bandas diagonales cruzadas */}
      <LinearGradient
        colors={[baseColor, metalColor, baseColor, metalColor, baseColor]}
        locations={[0, 0.3, 0.55, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      {/* Brillo suave que cruza en la otra dirección */}
      <LinearGradient
        colors={[`${highlightColor}00`, `${highlightColor}33`, `${highlightColor}00`]}
        locations={[0.2, 0.5, 0.8]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
    </View>
  );
}

export default LiquidMetalShader;
