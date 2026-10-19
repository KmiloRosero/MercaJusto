import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { BRAND, LogoBasket, LogoFruit, LogoLeaf, MARK_ORIGINS } from "./Logo";
import { motion } from "../theme";

const easeOut = Easing.bezier(...motion.easeOut);

// Geometría del splash nativo (plugin expo-splash-screen en app.json): la
// canasta vacía (assets/splash-icon.png) centrada a 200 pt de ancho.
// El primer fotograma de este componente es idéntico, así no hay salto.
const NATIVE_MARK = 200;

/** Tiempo mínimo desde que empieza la animación: deja ver la historia completa. */
const MIN_VISIBLE_MS = 1700;
/**
 * Al abrir, el hilo de JS está ocupado cargando la app: animaciones programadas
 * en ese momento llegan todas juntas. La historia empieza cuando la app está
 * lista, o como tarde a este tiempo; mientras tanto se ve la canasta quieta,
 * igual al splash nativo.
 */
const START_FALLBACK_MS = 800;

// Resortes: el fruto cae con un rebote corto; la hoja brota más suave.
const fruitSpring = { damping: 11, stiffness: 220, mass: 0.8 };
const leafSpring = { damping: 14, stiffness: 160 };

interface AnimatedSplashProps {
  /** La app terminó de cargar (sesión restaurada). */
  ready: boolean;
  onFinish: () => void;
}

/**
 * Continuación animada del splash nativo: "la canasta se llena".
 * 1. Canasta vacía, igual al splash nativo.
 * 2. El tomate cae dentro con un rebote y brota la hoja desde su tallo.
 * 3. Un pulso de luz detrás confirma la cosecha; la marca sube y aparece el nombre.
 * 4. Al estar lista la app, todo se desvanece mientras la marca crece un poco.
 * Con movimiento reducido no hay escalas ni desplazamientos: solo fundidos.
 */
export function AnimatedSplash({ ready, onFinish }: AnimatedSplashProps) {
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [introDone, setIntroDone] = useState(false);
  const [started, setStarted] = useState(false);
  const startedAt = useRef(0);

  const markSize = NATIVE_MARK;

  const fruit = useSharedValue(0);
  const leaf = useSharedValue(0);
  const pulse = useSharedValue(0);
  const lift = useSharedValue(0); // 0 → centrada, 1 → posición final
  const word = useSharedValue(0);
  const tagline = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    // El overlay ya cubre la pantalla: se puede soltar el splash nativo.
    SplashScreen.hideAsync().catch(() => {});
    const id = setTimeout(() => setStarted(true), START_FALLBACK_MS);
    return () => clearTimeout(id);
  }, []);

  // Empieza en cuanto la app está lista, en el siguiente cuadro libre.
  useEffect(() => {
    if (!ready || started) return;
    const frame = requestAnimationFrame(() => setStarted(true));
    return () => cancelAnimationFrame(frame);
  }, [ready, started]);

  useEffect(() => {
    if (!started) return;
    startedAt.current = Date.now();

    if (reduceMotion) {
      fruit.set(withTiming(1, { duration: 200 }));
      leaf.set(withTiming(1, { duration: 200 }));
      lift.set(1);
      word.set(withDelay(150, withTiming(1, { duration: 300 })));
      tagline.set(
        withDelay(250, withTiming(1, { duration: 300 }, (finished) => {
          if (finished) scheduleOnRN(setIntroDone, true);
        }))
      );
      return;
    }

    fruit.set(withDelay(180, withSpring(1, fruitSpring)));
    leaf.set(withDelay(330, withSpring(1, leafSpring)));
    pulse.set(withDelay(420, withTiming(1, { duration: 900, easing: easeOut })));
    lift.set(withDelay(700, withTiming(1, { duration: 620, easing: easeOut })));
    word.set(withDelay(820, withTiming(1, { duration: 460, easing: easeOut })));
    tagline.set(
      withDelay(
        920,
        withTiming(1, { duration: 460, easing: easeOut }, (finished) => {
          if (finished) scheduleOnRN(setIntroDone, true);
        })
      )
    );
  }, [started, reduceMotion, fruit, leaf, pulse, lift, word, tagline]);

  useEffect(() => {
    if (!ready || !introDone) return;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt.current));
    const id = setTimeout(() => {
      // La salida es más corta que la entrada: la app ya está lista.
      exit.set(
        withTiming(1, { duration: 300, easing: easeOut }, (finished) => {
          if (finished) scheduleOnRN(onFinish);
        })
      );
    }, wait);
    return () => clearTimeout(id);
  }, [ready, introDone, exit, onFinish]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -lift.value * markSize * 0.3 },
      { scale: reduceMotion ? 1 : 1 + exit.value * 0.08 },
    ],
  }));

  // El tomate cae desde arriba y crece desde su centro.
  const fruitStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, fruit.value * 2),
    transform: reduceMotion
      ? []
      : [{ translateY: (1 - fruit.value) * -markSize * 0.18 }, { scale: 0.4 + fruit.value * 0.6 }],
  }));

  // La hoja brota desde su tallo, girando un poco hasta su sitio.
  const leafStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, leaf.value * 3),
    transform: reduceMotion ? [] : [{ rotate: `${(1 - leaf.value) * -35}deg` }, { scale: leaf.value }],
  }));

  // Un solo pulso de luz, que se expande y se apaga.
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: (1 - pulse.value) * 0.35 * Math.min(1, pulse.value * 6),
    transform: [{ scale: 0.6 + pulse.value * 0.9 }],
  }));

  // El texto sube 12 pt mientras aparece; con movimiento reducido solo se desvanece.
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: reduceMotion ? 0 : (1 - word.value) * 12 }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.value * 0.86,
    transform: [{ translateY: reduceMotion ? 0 : (1 - tagline.value) * 12 }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
  }));

  const layer = { position: "absolute" as const, top: 0, left: 0, width: markSize, height: markSize };

  return (
    <Animated.View
      pointerEvents={ready && introDone ? "none" : "auto"}
      accessible
      accessibilityLabel="MercaJusto. Del campo nariñense a tu mesa"
      style={[StyleSheet.absoluteFill, styles.container, containerStyle]}
    >
      <Animated.View style={[{ width: markSize, height: markSize }, markStyle]}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: markSize * 0.05,
              top: markSize * 0.05,
              width: markSize * 0.9,
              height: markSize * 0.9,
              borderRadius: markSize,
              backgroundColor: BRAND.leaf,
            },
            pulseStyle,
          ]}
        />
        {/* Capas en el orden del logo: hoja, fruto y la canasta por delante. */}
        <Animated.View style={[layer, { transformOrigin: MARK_ORIGINS.leaf }, leafStyle]}>
          <LogoLeaf size={markSize} />
        </Animated.View>
        <Animated.View style={[layer, { transformOrigin: MARK_ORIGINS.fruit }, fruitStyle]}>
          <LogoFruit size={markSize} />
        </Animated.View>
        <View style={layer}>
          <LogoBasket size={markSize} />
        </View>
      </Animated.View>

      <View style={[styles.textBlock, { top: height / 2 + markSize * 0.38 }]}>
        <Animated.Text style={[styles.word, wordStyle]} accessibilityRole="header">
          Merca<Text style={{ color: BRAND.leaf }}>Justo</Text>
        </Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]}>Del campo nariñense a tu mesa</Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BRAND.field,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  textBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 8,
  },
  word: {
    color: "#FFFFFF",
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "800",
    letterSpacing: -1,
  },
  tagline: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
  },
});
