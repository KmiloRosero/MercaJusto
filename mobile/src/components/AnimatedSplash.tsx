import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { LogoMark } from "./Logo";
import { motion } from "../theme";

const BLUE = "#008FFF";
const easeOut = Easing.bezier(...motion.easeOut);

// Geometría del splash nativo (plugin expo-splash-screen en app.json): la marca
// (assets/splash-icon.png) se dibuja centrada a 200 pt de ancho. Reproducirla
// aquí evita cualquier salto en el instante en que se oculta el splash nativo.
const NATIVE_MARK = 200;

/** Tiempo mínimo en pantalla: deja leer la marca sin hacer esperar de más. */
const MIN_VISIBLE_MS = 1400;

interface AnimatedSplashProps {
  /** La app terminó de cargar (sesión restaurada). */
  ready: boolean;
  onFinish: () => void;
}

/**
 * Continuación animada del splash nativo. Primer fotograma idéntico al nativo;
 * luego la marca sube y aparece el nombre, y al estar lista la app se desvanece.
 * Es un momento de primera apertura (poco frecuente), por eso se permite una
 * duración mayor a la de la UI normal.
 */
export function AnimatedSplash({ ready, onFinish }: AnimatedSplashProps) {
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [introDone, setIntroDone] = useState(false);
  const mountedAt = useRef(Date.now());

  const markSize = NATIVE_MARK;

  const lift = useSharedValue(0); // 0 → posición centrada, 1 → posición final
  const word = useSharedValue(0);
  const tagline = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    // El overlay ya cubre la pantalla: se puede soltar el splash nativo.
    SplashScreen.hideAsync().catch(() => {});

    const lead = reduceMotion ? 0 : 160;
    lift.value = withDelay(lead, withTiming(1, { duration: reduceMotion ? 0 : 640, easing: easeOut }));
    word.value = withDelay(lead + 140, withTiming(1, { duration: 480, easing: easeOut }));
    tagline.value = withDelay(
      lead + 220,
      withTiming(1, { duration: 480, easing: easeOut }, (finished) => {
        if (finished) scheduleOnRN(setIntroDone, true);
      })
    );
  }, [reduceMotion, lift, word, tagline]);

  useEffect(() => {
    if (!ready || !introDone) return;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - mountedAt.current));
    const id = setTimeout(() => {
      exit.value = withTiming(1, { duration: 280, easing: easeOut }, (finished) => {
        if (finished) scheduleOnRN(onFinish);
      });
    }, wait);
    return () => clearTimeout(id);
  }, [ready, introDone, exit, onFinish]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.value * markSize * 0.32 }],
  }));

  // El texto sube 10 pt mientras aparece; con movimiento reducido solo se desvanece.
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: reduceMotion ? 0 : (1 - word.value) * 10 }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.value * 0.82,
    transform: [{ translateY: reduceMotion ? 0 : (1 - tagline.value) * 10 }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
  }));

  return (
    <Animated.View
      pointerEvents={ready && introDone ? "none" : "auto"}
      style={[StyleSheet.absoluteFill, styles.container, containerStyle]}
    >
      <Animated.View style={[{ width: markSize, height: markSize }, markStyle]}>
        <LogoMark size={markSize} />
      </Animated.View>

      <View style={[styles.textBlock, { top: height / 2 + markSize * 0.36 }]}>
        <Animated.Text style={[styles.word, wordStyle]} accessibilityRole="header">
          MercaJusto
        </Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]}>Del campo nariñense a tu mesa</Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BLUE,
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
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  tagline: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
  },
});
