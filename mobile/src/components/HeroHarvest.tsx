import React, { useEffect, useState } from "react";
import { Image, Platform, Text, View, type ImageSourcePropType, type PointerEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { radius, spacing, type } from "../theme";
import { Icon } from "./Icon";
import { PressableScale } from "./PressableScale";

// Cuadro principal del inicio: la cosecha de Nariño en 3D.
// - Fondo: foto de cultivos en ladera (la entregó el dueño del proyecto), con
//   un acercamiento lento y una neblina que cruza.
// - Carrusel 3D: los productos giran como en un carrusel de portadas; el del
//   centro de frente y flotando, los vecinos girados y más pequeños a los lados.
// Imágenes: aguacates, papa y maíz salen de la foto del dueño; rábanos, café y
// fresas son fotos de Unsplash (licencia libre). Todas con el fondo recortado.

const PAISAJE = require("../../assets/hero/paisaje.jpg");

interface Product {
  name: string;
  category: string;
  source: ImageSourcePropType;
  /** Ancho / alto de la imagen (todas miden 360 de alto). */
  ratio: number;
}

const PRODUCTS: Product[] = [
  { name: "Papa", category: "Tubérculos", source: require("../../assets/hero/papa.png"), ratio: 285 / 360 },
  { name: "Fresas", category: "Frutas", source: require("../../assets/hero/fresas.png"), ratio: 529 / 360 },
  { name: "Maíz", category: "Granos", source: require("../../assets/hero/maiz.png"), ratio: 371 / 360 },
  { name: "Rábanos", category: "Verduras", source: require("../../assets/hero/rabanos.png"), ratio: 530 / 360 },
  { name: "Aguacates", category: "Frutas", source: require("../../assets/hero/aguacates.png"), ratio: 390 / 360 },
  { name: "Café", category: "Café y cacao", source: require("../../assets/hero/cafe.png"), ratio: 686 / 360 },
];

const HEIGHT = 268;
/** Cada cuánto pasa el siguiente producto. */
const STEP_MS = 3200;
/** Caja donde vive cada producto (el del centro), en dp. */
const ITEM_H = 132;

/** Distancia circular entre el producto i y la posición p del carrusel. */
function offsetOf(i: number, p: number, n: number) {
  "worklet";
  let d = (((i - p) % n) + n) % n;
  if (d > n / 2) d -= n;
  return d;
}

/** Un producto del carrusel, con su sombra en el suelo. */
function CarouselItem({
  product,
  index,
  count,
  position,
  float,
  width,
}: {
  product: Product;
  index: number;
  count: number;
  position: SharedValue<number>;
  float: SharedValue<number>;
  width: number;
}) {
  const itemW = Math.min(ITEM_H * product.ratio, width * 0.62);
  const itemH = itemW / product.ratio;

  const style = useAnimatedStyle(() => {
    const d = offsetOf(index, position.value, count);
    const ad = Math.abs(d);
    const isFront = ad < 0.5;
    return {
      opacity: interpolate(ad, [0, 1, 1.6], [1, 0.75, 0], "clamp"),
      zIndex: Math.round(10 - ad * 4),
      transform: [
        { perspective: 700 },
        { translateX: d * width * 0.36 },
        { translateY: interpolate(ad, [0, 1], [0, 10], "clamp") + (isFront ? (float.value - 0.5) * -7 : 0) },
        { rotateY: `${interpolate(d, [-1.5, 0, 1.5], [52, 0, -52], "clamp")}deg` },
        { scale: interpolate(ad, [0, 1, 1.6], [1, 0.62, 0.45], "clamp") },
      ],
    };
  });

  // La sombra se encoge cuando el producto sube: da altura sin dibujar nada más.
  const shadow = useAnimatedStyle(() => {
    const d = offsetOf(index, position.value, count);
    const ad = Math.abs(d);
    return {
      opacity: interpolate(ad, [0, 1, 1.6], [0.45, 0.25, 0], "clamp") * (1 - (float.value - 0.5) * 0.3),
      transform: [
        { translateX: d * width * 0.36 },
        { scaleX: interpolate(ad, [0, 1], [1, 0.6], "clamp") * (1 - float.value * 0.12) },
      ],
    };
  });

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            bottom: 10,
            left: width / 2 - itemW * 0.42,
            width: itemW * 0.84,
            height: 16,
            borderRadius: 999,
            backgroundColor: "#0B1A0E",
          },
          shadow,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", bottom: 18, left: width / 2 - itemW / 2, width: itemW, height: itemH }, style]}
      >
        <Image source={product.source} style={{ width: "100%", height: "100%" }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Animated.View>
    </>
  );
}

/**
 * Cuadro 3D del inicio. Tocarlo abre Buscar. En la web se inclina hacia el
 * puntero. Con movimiento reducido no gira ni se mueve: se ve el primer producto.
 */
export function HeroHarvest({ width, onPress }: { width: number; onPress: () => void }) {
  const reduceMotion = useReducedMotion();
  const position = useSharedValue(0);
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const float = useSharedValue(0.5);
  const kenBurns = useSharedValue(0);
  const mist = useSharedValue(0);
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const [front, setFront] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    enter.set(withDelay(100, withSpring(1, { damping: 15, stiffness: 120 })));
    float.set(withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true));
    kenBurns.set(withRepeat(withTiming(1, { duration: 14000, easing: Easing.inOut(Easing.quad) }), -1, true));
    mist.set(withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 16000, easing: Easing.linear })), -1));
    const id = setInterval(() => {
      position.set(withTiming(Math.round(position.value) + 1, { duration: 950, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
    }, STEP_MS);
    return () => clearInterval(id);
  }, [reduceMotion, enter, float, kenBurns, mist, position]);

  // El nombre del producto de enfrente cambia cuando el carrusel pasa la mitad del giro.
  useAnimatedReaction(
    () => ((Math.round(position.value) % PRODUCTS.length) + PRODUCTS.length) % PRODUCTS.length,
    (i, prev) => {
      if (i !== prev) scheduleOnRN(setFront, i);
    }
  );

  const bgStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1.12 + kenBurns.value * 0.1 },
      { translateX: (kenBurns.value - 0.5) * -16 + tiltY.value * -10 },
      { translateY: tiltX.value * -6 },
    ],
  }));
  const mistStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(mist.value, [0, 1], [-width, width]) }],
  }));
  const stageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(enter.value, [0, 0.5, 1], [0, 1, 1]),
    transform: [{ translateY: (1 - enter.value) * 30 + tiltX.value * 6 }, { translateX: tiltY.value * 12 }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateX: `${tiltX.value * -5}deg` }, { rotateY: `${tiltY.value * 7}deg` }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 10 }],
  }));

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

  const current = PRODUCTS[front];

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
          backgroundColor: "#24402C",
          shadowColor: "#0A140E",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.25,
          shadowRadius: 24,
          elevation: 10,
        }}
      >
        {/* Paisaje con acercamiento lento */}
        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, bgStyle]}>
          <Image source={PAISAJE} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors />
        </Animated.View>

        {/* Neblina que cruza la ladera */}
        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: HEIGHT * 0.32, height: HEIGHT * 0.3, width: width * 0.9 }, mistStyle]}>
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(240,245,235,0.22)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>

        {/* Velos: oscuro arriba para el texto, tierra abajo donde se apoyan los productos */}
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(8,20,12,0.72)", "rgba(8,20,12,0.25)", "rgba(8,20,12,0)"]}
          locations={[0, 0.35, 0.6]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: HEIGHT }}
        />
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(20,32,16,0)", "rgba(20,32,16,0.55)"]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: HEIGHT * 0.32 }}
        />

        {/* Carrusel 3D de productos */}
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, bottom: 0, height: ITEM_H + 40 }, stageStyle]}>
          {PRODUCTS.map((p, i) => (
            <CarouselItem key={p.name} product={p} index={i} count={PRODUCTS.length} position={position} float={float} width={width} />
          ))}
        </Animated.View>

        {/* Mensaje corto */}
        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: spacing[5], left: spacing[5], right: spacing[5], gap: spacing[2] }, textStyle]}>
          <Text style={[type.title, { color: "#FFFFFF", fontSize: 26, lineHeight: 30, letterSpacing: -0.6 }]}>Del campo a tu mesa</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
            <View
              accessibilityLiveRegion="polite"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                height: 28,
                paddingHorizontal: 10,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.18)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.28)",
              }}
            >
              <Icon name="leaf" size={13} color="#FFFFFF" />
              <Text style={[type.footnote, { color: "#FFFFFF", fontWeight: "700" }]}>
                {current.name} · {current.category}
              </Text>
            </View>
            <Text style={[type.footnote, { color: "#E6F0E6", fontWeight: "600" }]}>de Nariño</Text>
            <Icon name="arrow-forward" size={14} color="#E6F0E6" />
          </View>
        </Animated.View>

        {/* Puntos del carrusel */}
        <View pointerEvents="none" style={{ position: "absolute", right: spacing[4], bottom: spacing[3], flexDirection: "row", gap: 5 }}>
          {PRODUCTS.map((p, i) => (
            <View
              key={p.name}
              style={{ width: i === front ? 14 : 5, height: 5, borderRadius: 3, backgroundColor: i === front ? "#FFFFFF" : "rgba(255,255,255,0.45)" }}
            />
          ))}
        </View>
      </PressableScale>
    </Animated.View>
  );
}
