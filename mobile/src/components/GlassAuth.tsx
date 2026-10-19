import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { radius, spacing } from "../theme";
import { Icon } from "./Icon";
import { PressableScale } from "./PressableScale";

// Piezas de la pantalla de acceso "vidrio oscuro": adaptación a React Native
// de una tarjeta de inicio de sesión web (framer-motion + Tailwind), en el
// verde de MercaJusto. Paleta fija y oscura en ambos temas: es un momento de marca.

export const GLASS = {
  ground: "#030806",
  glow: "#1F6B3D",
  card: "rgba(255,255,255,0.05)",
  cardBorder: "rgba(255,255,255,0.09)",
  field: "rgba(255,255,255,0.06)",
  fieldBorder: "rgba(255,255,255,0.10)",
  focus: "#3DBE72",
  text: "#F2F5F3",
  /** 0.72 sobre el suelo: ~10:1 de contraste. */
  textSecondary: "rgba(242,245,243,0.72)",
  placeholder: "rgba(242,245,243,0.42)",
  action: "#3DBE72",
  onAction: "#03140A",
  danger: "#F2B8B5",
} as const;

/** Fondo: suelo casi negro, resplandor verde arriba y un halo que respira despacio. */
export function GlassBackdrop() {
  const reduceMotion = useReducedMotion();
  const breathe = useSharedValue(0.55);

  useEffect(() => {
    if (reduceMotion) return;
    breathe.set(withRepeat(withTiming(0.9, { duration: 6000, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduceMotion, breathe]);

  const haloStyle = useAnimatedStyle(() => ({ opacity: breathe.value }));

  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: GLASS.ground }}>
      <LinearGradient
        colors={["rgba(31,107,61,0.55)", "rgba(31,107,61,0.18)", "rgba(3,8,6,0)"]}
        locations={[0, 0.35, 0.75]}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <Animated.View style={[{ position: "absolute", top: -160, alignSelf: "center", width: 520, height: 360 }, haloStyle]}>
        <LinearGradient
          colors={["rgba(61,190,114,0.32)", "rgba(61,190,114,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ flex: 1, borderBottomLeftRadius: 260, borderBottomRightRadius: 260 }}
        />
      </Animated.View>
    </View>
  );
}

/**
 * Tarjeta de vidrio con un haz de luz que recorre el borde superior.
 * Un solo elemento animado; con movimiento reducido el haz no aparece.
 */
export function GlassCard({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const beam = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || !width) return;
    beam.set(
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withDelay(1200, withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }))
        ),
        -1
      )
    );
  }, [reduceMotion, width, beam]);

  const beamStyle = useAnimatedStyle(() => ({
    opacity: beam.value > 0 && beam.value < 1 ? 1 : 0,
    transform: [{ translateX: -width * 0.5 + beam.value * width * 1.5 }],
  }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        borderRadius: radius.xl,
        backgroundColor: GLASS.card,
        borderWidth: 1,
        borderColor: GLASS.cardBorder,
        padding: spacing[6],
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.5,
        shadowRadius: 40,
        elevation: 12,
      }}
    >
      {!reduceMotion ? (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, width: "50%", height: 2 }, beamStyle]}>
          <LinearGradient
            colors={["rgba(155,227,181,0)", "rgba(155,227,181,0.9)", "rgba(155,227,181,0)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      ) : null}
      {children}
    </View>
  );
}

type FieldProps = Omit<TextInputProps, "style"> & {
  label: string;
  icon: string;
  /** Campo de contraseña con botón de mostrar/ocultar. */
  password?: boolean;
  /** Algo fijo a la izquierda del texto, p. ej. "+57". */
  prefix?: string;
  hint?: string;
};

/** Campo con etiqueta visible arriba (nunca solo el placeholder), ícono y borde verde al enfocar. */
export function GlassField({ label, icon, password, prefix, hint, onFocus, onBlur, ...props }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: GLASS.textSecondary, fontSize: 13, fontWeight: "600" }}>{label}</Text>
      <View
        style={{
          height: 48,
          borderRadius: radius.md,
          backgroundColor: focused ? "rgba(255,255,255,0.09)" : GLASS.field,
          borderWidth: 1.5,
          borderColor: focused ? GLASS.focus : GLASS.fieldBorder,
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: spacing[3],
        }}
      >
        <Icon name={icon} size={18} color={focused ? GLASS.text : GLASS.placeholder} />
        {prefix ? (
          <Text style={{ color: GLASS.text, fontSize: 16, marginLeft: spacing[2] }}>{prefix}</Text>
        ) : null}
        <TextInput
          placeholderTextColor={GLASS.placeholder}
          selectionColor={GLASS.focus}
          accessibilityLabel={label}
          {...props}
          secureTextEntry={password ? !visible : undefined}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={{
            flex: 1,
            height: "100%",
            paddingLeft: spacing[2],
            paddingRight: password ? 0 : spacing[3],
            color: GLASS.text,
            fontSize: 16,
            // En la web el foco lo marca el borde verde del contenedor, no el contorno del navegador.
            ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
          }}
        />
        {password ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={GLASS.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {hint ? <Text style={{ color: GLASS.placeholder, fontSize: 13 }}>{hint}</Text> : null}
    </View>
  );
}

/** Botón principal verde brillante con tinta oscura, flecha y estado de carga. */
export function GlassButton({ title, onPress, loading }: { title: string; onPress: () => void; loading?: boolean }) {
  return (
    <PressableScale
      onPress={loading ? undefined : onPress}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityState={{ busy: !!loading }}
      accessibilityLabel={title}
      style={{
        height: 52,
        borderRadius: radius.full,
        backgroundColor: GLASS.action,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing[2],
      }}
    >
      {loading ? (
        <ActivityIndicator color={GLASS.onAction} />
      ) : (
        <>
          <Text style={{ color: GLASS.onAction, fontSize: 16, fontWeight: "800" }}>{title}</Text>
          <Icon name="arrow-forward" size={18} color={GLASS.onAction} />
        </>
      )}
    </PressableScale>
  );
}
