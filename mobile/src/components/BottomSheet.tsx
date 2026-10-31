import React, { useEffect, useId, useLayoutEffect, useState } from "react";
import {
  BackHandler,
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
  useAnimatedKeyboard,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import { motion, radius, spacing, useTheme } from "../theme";
import { Icon } from "./Icon";
import { useSheetPortal } from "./SheetHost";

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
  // Con Android de borde a borde la ventana ya no se encoge con el teclado:
  // la hoja sube exactamente lo que mide el teclado, en las dos plataformas.
  const keyboard = useAnimatedKeyboard();

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
    transform: [{ translateY: offset.value - keyboard.height.value }],
    // Con el teclado abierto la hoja se encoge para no salirse por arriba.
    maxHeight: (windowHeight - keyboard.height.value) * 0.85,
  }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.value, [0, travel], [1, 0], "clamp"),
  }));

  // El botón atrás de Android cierra la hoja, como lo hacía el Modal.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  // La hoja se dibuja en SheetHost (raíz de la app), no aquí.
  const id = useId();
  const setNode = useSheetPortal((s) => s.set);
  const removeNode = useSheetPortal((s) => s.remove);
  const content = !mounted ? null : (
        <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
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
                      backgroundColor: t.bgInput,
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
        </View>
  );
  useLayoutEffect(() => {
    if (content) setNode(id, content);
    else removeNode(id);
  });
  useEffect(() => () => removeNode(id), [id, removeNode]);

  return null;
}
