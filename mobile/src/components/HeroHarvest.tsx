import React, { useEffect } from "react";
import { Image, Platform, Text, View, type PointerEvent } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { radius, spacing, type } from "../theme";
import { Icon } from "./Icon";
import { PressableScale } from "./PressableScale";
import { NarinoLandscapeLayer, type LandscapeLayer } from "./NarinoLandscape";

// Foto de productos (aguacates, papa en costal y maíz) que entregó el dueño
// del proyecto; se recortó el fondo blanco para posarla sobre el paisaje.
const HARVEST = require("../../assets/hero-cosecha.png");
const HARVEST_RATIO = 900 / 362;

const HEIGHT = 244;

/** Desplazamiento de una capa del paisaje según su profundidad (0 lejos, 1 cerca). */
function depthTransform(depth: number, float: number, tiltX: number, tiltY: number) {
  "worklet";
  return {
    transform: [
      { translateX: (float - 0.5) * -6 * depth + tiltY * 10 * depth },
      { translateY: tiltX * 6 * depth },
      { scale: 1.06 },
    ],
  };
}

/**
 * Cuadro principal del inicio: la cosecha de Nariño en 3D sobre su paisaje.
 * Profundidad por capas: el cielo casi quieto, el volcán, las lomas y la
 * cosecha al frente se mueven a distinta velocidad mientras "flota". En la web
 * el cuadro además se inclina hacia el puntero. Con movimiento reducido queda quieto.
 */
export function HeroHarvest({ width, onPress }: { width: number; onPress: () => void }) {
  const reduceMotion = useReducedMotion();
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const float = useSharedValue(0);
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    enter.set(withDelay(120, withSpring(1, { damping: 14, stiffness: 120 })));
    // Vaivén lento y continuo: la cosecha "respira" sobre el paisaje.
    float.set(withDelay(900, withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true)));
  }, [reduceMotion, enter, float]);

  // Cada capa se desplaza según su profundidad (más cerca, más movimiento).
  const sky = useAnimatedStyle(() => depthTransform(0.15, float.value, tiltX.value, tiltY.value));
  const far = useAnimatedStyle(() => depthTransform(0.4, float.value, tiltX.value, tiltY.value));
  const mid = useAnimatedStyle(() => depthTransform(0.7, float.value, tiltX.value, tiltY.value));
  const front = useAnimatedStyle(() => depthTransform(1, float.value, tiltX.value, tiltY.value));

  const harvestStyle = useAnimatedStyle(() => ({
    opacity: interpolate(enter.value, [0, 0.4, 1], [0, 1, 1]),
    transform: [
      { translateY: (1 - enter.value) * 40 + (float.value - 0.5) * -6 + tiltX.value * 8 },
      { translateX: tiltY.value * 14 },
      { scale: 0.92 + enter.value * 0.08 },
    ],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateX: `${tiltX.value * -6}deg` }, { rotateY: `${tiltY.value * 8}deg` }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(enter.value, [0, 1], [0, 1]),
    transform: [{ translateY: (1 - enter.value) * 10 }],
  }));

  // Inclinación hacia el puntero (solo web; en el celular el dedo hace scroll).
  const pointerProps =
    Platform.OS === "web" && !reduceMotion
      ? {
          onPointerMove: (e: PointerEvent) => {
            const { offsetX = width / 2, offsetY = HEIGHT / 2 } = e.nativeEvent;
            tiltY.set(withTiming((offsetX / width - 0.5) * 2, { duration: 120 }));
            tiltX.set(withTiming((offsetY / HEIGHT - 0.5) * 2, { duration: 120 }));
          },
          onPointerLeave: () => {
            tiltY.set(withSpring(0));
            tiltX.set(withSpring(0));
          },
        }
      : {};

  const layers: { key: LandscapeLayer; style: typeof sky }[] = [
    { key: "sky", style: sky },
    { key: "far", style: far },
    { key: "mid", style: mid },
    { key: "front", style: front },
  ];
  const harvestW = width - spacing[4] * 2;

  return (
    <Animated.View style={[{ width, height: HEIGHT }, cardStyle]} {...pointerProps}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Del campo a tu mesa. Ver cosechas de Nariño"
        style={{
          width,
          height: HEIGHT,
          borderRadius: radius.xl + 4,
          overflow: "hidden",
          backgroundColor: "#2F6352",
          shadowColor: "#0A140E",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.22,
          shadowRadius: 22,
          elevation: 8,
        }}
      >
        {layers.map((l) => (
          <Animated.View key={l.key} pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, l.style]}>
            <NarinoLandscapeLayer layer={l.key} />
          </Animated.View>
        ))}

        {/* La cosecha al frente, apoyada en la loma */}
        <Animated.View
          pointerEvents="none"
          style={[{ position: "absolute", left: spacing[4], bottom: 4, width: harvestW, height: harvestW / HARVEST_RATIO }, harvestStyle]}
        >
          <Image source={HARVEST} style={{ width: "100%", height: "100%" }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Animated.View>

        {/* Mensaje corto sobre el cielo oscuro */}
        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: spacing[5], left: spacing[5], right: spacing[5], gap: 6 }, textStyle]}>
          <Text style={[type.title, { color: "#FFFFFF", fontSize: 26, lineHeight: 30, letterSpacing: -0.6 }]}>Del campo a tu mesa</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[type.footnote, { color: "#E6F0E6", fontWeight: "600" }]}>Cosecha de Nariño, directo del campesino</Text>
            <Icon name="arrow-forward" size={14} color="#E6F0E6" />
          </View>
        </Animated.View>
      </PressableScale>
    </Animated.View>
  );
}
