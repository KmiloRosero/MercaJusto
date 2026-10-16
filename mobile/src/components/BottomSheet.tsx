import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import { motion, radius, spacing, useTheme } from "../theme";
import { Icon } from "./Icon";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  scrollable?: boolean;
}

// Entrada con la curva de drawer de iOS; la salida es más corta: cuando el
// usuario ya decidió cerrar, la app no lo hace esperar.
const ENTER = { duration: 320, easing: Easing.bezier(...motion.drawer) };
const EXIT = { duration: 200, easing: Easing.bezier(...motion.easeOut) };
// Un gesto rápido hacia abajo cierra aunque no se haya arrastrado mucho (px/s).
const FLICK_VELOCITY = 600;
const DISMISS_FRACTION = 0.3;

export function BottomSheet({ visible, onClose, title, children, scrollable = true }: BottomSheetProps) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();

  // El Modal sigue montado mientras corre la animación de salida.
  const [mounted, setMounted] = useState(visible);
  const [sheetHeight, setSheetHeight] = useState(0);
  const travel = sheetHeight || windowHeight;

  // Cuánto está desplazada la hoja hacia abajo: 0 = abierta, travel = oculta.
  // Una sola variable mueve la hoja y el fondo, así abrir, cerrar y arrastrar
  // se pueden interrumpir entre sí sin saltos.
  const offset = useSharedValue(windowHeight);

  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      offset.set(reduceMotion ? withTiming(0, { duration: 0 }) : withTiming(0, ENTER));
    } else {
      offset.set(
        withTiming(travel, reduceMotion ? { duration: 0 } : EXIT, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        })
      );
    }
  }, [visible, mounted, travel, reduceMotion, offset]);

  // Antes de medirla, la hoja parte desde el borde de la pantalla; después,
  // se oculta exactamente su propia altura.
  const onSheetLayout = (e: LayoutChangeEvent) => setSheetHeight(e.nativeEvent.layout.height);

  // Arrastrar desde la manija o el título. Hacia arriba hay fricción en vez de un tope seco.
  const drag = Gesture.Pan()
    .onChange((e) => {
      const next = offset.value + e.changeY;
      offset.set(next < 0 ? next * 0.25 : next);
    })
    .onEnd((e) => {
      if (offset.value > travel * DISMISS_FRACTION || e.velocityY > FLICK_VELOCITY) {
        scheduleOnRN(onClose);
      } else {
        offset.set(withSpring(0, motion.release));
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.value, [0, travel], [1, 0], "clamp"),
  }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Animated.View style={[{ flex: 1, backgroundColor: t.scrim }, scrimStyle]}>
            <Pressable
              style={{ flex: 1 }}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            />
          </Animated.View>
          <Animated.View
            onLayout={onSheetLayout}
            style={[
              {
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: t.bgPrimary,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                paddingBottom: spacing[6],
                maxHeight: "85%",
              },
              sheetStyle,
            ]}
          >
            <GestureDetector gesture={drag}>
              <View style={{ paddingTop: spacing[3] }}>
                <View
                  style={{
                    width: 40,
                    height: 5,
                    borderRadius: radius.full,
                    backgroundColor: t.gray300,
                    alignSelf: "center",
                    marginBottom: spacing[4],
                  }}
                />
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: spacing[4],
                    marginBottom: spacing[4],
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: "800", color: t.textPrimary }}>{title}</Text>
                  <Pressable
                    onPress={onClose}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar"
                    style={({ pressed }) => ({
                      width: 32,
                      height: 32,
                      borderRadius: radius.full,
                      backgroundColor: t.bgSecondary,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Icon name="close" size={20} color={t.textSecondary} />
                  </Pressable>
                </View>
              </View>
            </GestureDetector>
            {scrollable ? (
              <ScrollView
                contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[4] }}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>
            ) : (
              <View style={{ paddingHorizontal: spacing[4] }}>{children}</View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
