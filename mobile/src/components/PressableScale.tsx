import React from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { motion } from "../theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const pressIn = { duration: motion.pressIn, easing: Easing.bezier(...motion.easeOut) };

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  /** Escala al presionar: 0.98 para tarjetas y filas, 0.95-0.97 para controles pequeños. */
  scaleTo?: number;
};

/**
 * Presionable que se hunde un poco al tocarlo y vuelve con un resorte
 * interrumpible: confirma que la app escuchó el toque. Es la misma respuesta
 * de Button y ProductCard, para tarjetas, filas y controles sueltos.
 */
export function PressableScale({ scaleTo = 0.98, style, onPressIn, onPressOut, disabled, ...props }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) scale.set(withTiming(scaleTo, pressIn));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, motion.release));
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    />
  );
}
