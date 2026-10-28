import React, { useEffect, useState } from "react";
import { Image, Text, View, type LayoutChangeEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { RescueProduct } from "../api/types";
import { formatCOP, motion, radius, spacing, type } from "../theme";
import { effectivePrice } from "../lib/pricing";
import { plazaComparison } from "../lib/savings";
import { countdownLabel, msUntil, unitCount } from "../lib/rescue";
import { useAddToCart } from "../lib/useAddToCart";
import { ProductArt } from "./harvestArt";
import { Icon } from "./Icon";
import { PressableScale } from "./PressableScale";

// Cuadro principal del inicio: "Rescátalo antes de que se pierda".
// Muestra el excedente que se pierde primero: cuánto falta (cuenta regresiva),
// cuánto queda (la barra se vacía) y un botón para rescatarlo. Si hay varios,
// pasan cada 6 s con un fundido corto.
//
// Movimiento, cada uno con un propósito:
// - Cambio de producto: fundido de 160 ms de salida y 260 ms de entrada
//   (evita el salto brusco). Con movimiento reducido, solo el fundido.
// - Barra: se vacía hasta lo que queda al aparecer el producto (cuenta el
//   estado: "esto se está acabando").
// - Punto que late: solo cuando faltan menos de 6 h (urgencia real).
// - La ilustración flota apenas, para que el cuadro se sienta vivo.
// Los números de la cuenta regresiva no se animan: cambian cada segundo y
// moverlos sería ruido.

const BG = ["#1F3D29", "#142A1C"] as const;
const INK = "#FFFFFF";
const INK_SOFT = "#C9DCCB";
const AMBER = "#FFC86B";
const HOT = "#FF8A5B";

const ROTATE_MS = 6000;
const URGENT_MS = 6 * 3600 * 1000;
const ART = 132;

const easeOut = Easing.bezier(...motion.easeOut);

export function RescueHero({
  products,
  canAdd,
  onOpen,
}: {
  products: RescueProduct[];
  canAdd: boolean;
  onOpen: (id: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const show = useSharedValue(0);
  const float = useSharedValue(0.5);

  const count = products.length;
  const product = products[index % count];

  // Entra cada producto (también el primero).
  useEffect(() => {
    show.set(withTiming(1, { duration: 260, easing: easeOut }));
  }, [index, show]);

  // Pasa al siguiente: sale con un fundido corto y luego cambia.
  useEffect(() => {
    if (count < 2) return;
    const next = () => setIndex((i) => (i + 1) % count);
    const id = setTimeout(() => {
      show.set(
        withTiming(0, { duration: 160, easing: easeOut }, (finished) => {
          if (finished) scheduleOnRN(next);
        })
      );
    }, ROTATE_MS);
    return () => clearTimeout(id);
  }, [index, count, show]);

  useEffect(() => {
    if (reduceMotion) return;
    float.set(withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduceMotion, float]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: show.value,
    transform: [{ translateY: reduceMotion ? 0 : (1 - show.value) * 8 }],
  }));
  const artStyle = useAnimatedStyle(() => ({
    opacity: show.value,
    transform: [
      { translateY: reduceMotion ? 0 : (float.value - 0.5) * -6 },
      { scale: reduceMotion ? 1 : 0.94 + show.value * 0.06 },
      { rotateZ: `${reduceMotion ? 0 : (float.value - 0.5) * 3}deg` },
    ],
  }));

  const goTo = (i: number) => {
    show.set(0);
    setIndex(i);
  };

  const price = effectivePrice(product);
  const plaza = plazaComparison(product);
  const producer = product.producer?.name.split(" ").slice(0, 2).join(" ");

  return (
    <View
      style={{
        borderRadius: radius.xl + 4,
        overflow: "hidden",
        backgroundColor: BG[1],
        shadowColor: "#0A140E",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.22,
        shadowRadius: 24,
        elevation: 10,
      }}
    >
      <LinearGradient colors={BG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", inset: 0 }} />
      {/* Sol de la tarde detrás del producto */}
      <View pointerEvents="none" style={{ position: "absolute", right: -46, top: -10, width: 230, height: 230, borderRadius: 115, backgroundColor: AMBER, opacity: 0.08 }} />
      <View pointerEvents="none" style={{ position: "absolute", right: -6, top: 30, width: 150, height: 150, borderRadius: 75, backgroundColor: AMBER, opacity: 0.1 }} />

      {/* Parte superior: abre el producto */}
      <PressableScale
        onPress={() => onOpen(product.id)}
        accessibilityRole="button"
        accessibilityLabel={`${product.name} de ${producer ?? "un productor"}, ${formatCOP(price)} por ${product.unit}, ${product.discountPct}% menos. Ver producto`}
        style={{ flexDirection: "row", paddingHorizontal: spacing[5], paddingTop: spacing[5], gap: spacing[2] }}
      >
        <Animated.View style={[{ flex: 1, gap: spacing[1], minHeight: 140 }, contentStyle]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2], marginBottom: spacing[1] }}>
            <UrgencyDot product={product} />
            <Text style={[type.overline, { color: AMBER }]}>RESCÁTALO HOY</Text>
          </View>
          <Text style={[type.title, { color: INK, fontSize: 26, lineHeight: 30, letterSpacing: -0.6 }]} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={[type.footnote, { color: INK_SOFT }]} numberOfLines={1}>
            {producer} · {product.municipio}
          </Text>
          <Text style={{ color: INK, fontSize: 24, lineHeight: 28, fontWeight: "800", letterSpacing: -0.5, marginTop: spacing[2] }} numberOfLines={1}>
            {formatCOP(price)}
            <Text style={[type.footnote, { color: INK_SOFT }]}>/{product.unit}</Text>
          </Text>
          {plaza ? (
            <Text style={[type.footnote, { color: INK_SOFT, fontWeight: "400" }]}>
              En plaza <Text style={{ textDecorationLine: "line-through" }}>{formatCOP(plaza.plaza)}</Text>
            </Text>
          ) : null}
        </Animated.View>

        <Animated.View style={[{ width: ART, height: ART, alignSelf: "center", marginRight: -spacing[2] }, artStyle]}>
          {product.photoUrl ? (
            <Image
              source={{ uri: product.photoUrl }}
              style={{ width: ART, height: ART, borderRadius: ART / 2, borderWidth: 3, borderColor: "rgba(255,255,255,0.85)" }}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <ProductArt name={product.name} categorySlug={product.category?.slug} />
          )}
          {/* Descuento como sello pegado al producto */}
          <View
            style={{
              position: "absolute",
              top: 2,
              left: -4,
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: AMBER,
              borderWidth: 2,
              borderColor: "#FFE7B8",
              alignItems: "center",
              justifyContent: "center",
              transform: [{ rotate: "-12deg" }],
            }}
          >
            <Text style={{ color: "#3A2304", fontSize: 15, lineHeight: 17, fontWeight: "900", letterSpacing: -0.4 }}>-{product.discountPct}%</Text>
          </View>
        </Animated.View>
      </PressableScale>

      {/* Parte inferior: plazo, lo que queda y el botón */}
      <Animated.View style={[{ paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[5], gap: spacing[3] }, contentStyle]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
          <Countdown product={product} />
          {count > 1 ? <Dots count={count} active={index % count} onPick={goTo} /> : null}
        </View>
        <StockBar product={product} reduceMotion={reduceMotion} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
          <Text style={[type.footnote, { flex: 1, color: INK_SOFT }]} numberOfLines={2}>
            Quedan <Text style={{ color: INK, fontWeight: "700" }}>{unitCount(product.stock, product.unit)}</Text>
            {product.rescuedToday > 0 ? ` · ${unitCount(product.rescuedToday, product.unit)} rescatados hoy` : " · sé el primero en rescatarlo"}
          </Text>
          {canAdd ? <RescueButton product={product} /> : null}
        </View>
      </Animated.View>
    </View>
  );
}

/** Punto ámbar; late en rojo tierra cuando faltan menos de 6 h. */
function UrgencyDot({ product }: { product: RescueProduct }) {
  const reduceMotion = useReducedMotion();
  const urgent = !!product.losesAt && msUntil(product.losesAt) < URGENT_MS;
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!urgent || reduceMotion) {
      pulse.set(0);
      return;
    }
    pulse.set(withRepeat(withSequence(withTiming(1, { duration: 1400, easing: easeOut }), withTiming(0, { duration: 0 })), -1));
  }, [urgent, reduceMotion, pulse]);

  const ring = useAnimatedStyle(() => ({
    opacity: (1 - pulse.value) * 0.7,
    transform: [{ scale: 1 + pulse.value * 1.4 }],
  }));
  const color = urgent ? HOT : AMBER;
  return (
    <View style={{ width: 10, height: 10, alignItems: "center", justifyContent: "center" }}>
      {urgent ? <Animated.View style={[{ position: "absolute", width: 10, height: 10, borderRadius: 5, backgroundColor: color }, ring]} /> : null}
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

/** "Se pierde en 06:59:12". Se actualiza cada segundo; solo se repinta este pedazo. */
function Countdown({ product }: { product: RescueProduct }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!product.losesAt) {
    return (
      <Text style={[type.callout, { flex: 1, color: AMBER }]} numberOfLines={1}>
        Cosecha con descuento
      </Text>
    );
  }
  const left = msUntil(product.losesAt);
  const urgent = left < URGENT_MS;
  return (
    <View
      accessible
      accessibilityLabel={`Se pierde en ${countdownLabel(left)}`}
      style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing[2] }}
    >
      <Icon name="time-outline" size={18} color={urgent ? HOT : AMBER} />
      <Text style={[type.footnote, { color: INK_SOFT }]}>Se pierde en</Text>
      <Text
        style={{
          color: urgent ? HOT : AMBER,
          fontSize: 20,
          lineHeight: 24,
          fontWeight: "800",
          fontVariant: ["tabular-nums"],
          letterSpacing: 0.3,
        }}
      >
        {countdownLabel(left)}
      </Text>
    </View>
  );
}

/** Barra de lo que queda frente a lo que había hoy. Se vacía al aparecer el producto. */
function StockBar({ product, reduceMotion }: { product: RescueProduct; reduceMotion: boolean }) {
  const [width, setWidth] = useState(0);
  const fill = useSharedValue(1);
  const total = product.stock + product.rescuedToday;
  const left = total > 0 ? product.stock / total : 0;
  // Nunca vacía del todo a la vista mientras queda algo.
  const target = product.stock > 0 ? Math.max(left, 0.06) : 0;

  useEffect(() => {
    if (reduceMotion) {
      fill.set(target);
      return;
    }
    fill.set(1);
    fill.set(withTiming(target, { duration: 900, easing: easeOut }));
  }, [product.id, target, reduceMotion, fill]);

  const barStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -(1 - fill.value) * width }] }));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: product.stock }}
      style={{ height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.14)" }}
    >
      <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: 4, overflow: "hidden" }, barStyle]}>
        <LinearGradient colors={[HOT, AMBER]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
}

function Dots({ count, active, onPick }: { count: number; active: number; onPick: (i: number) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
      {Array.from({ length: count }, (_, i) => (
        <PressableScale
          key={i}
          scaleTo={0.9}
          onPress={() => onPick(i)}
          hitSlop={{ top: 14, bottom: 14 }}
          accessibilityRole="button"
          accessibilityLabel={`Excedente ${i + 1} de ${count}`}
          accessibilityState={{ selected: i === active }}
          style={{ paddingHorizontal: 3, paddingVertical: 6 }}
        >
          <View style={{ width: i === active ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === active ? INK : "rgba(255,255,255,0.4)" }} />
        </PressableScale>
      ))}
    </View>
  );
}

/** Agrega una unidad a la canasta y lo confirma en el mismo botón. */
function RescueButton({ product }: { product: RescueProduct }) {
  const addToCart = useAddToCart();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  useEffect(() => {
    if (state !== "done") return;
    const id = setTimeout(() => setState("idle"), 1800);
    return () => clearTimeout(id);
  }, [state]);

  const done = state === "done";
  return (
    <PressableScale
      scaleTo={0.96}
      disabled={state === "busy"}
      onPress={async () => {
        setState("busy");
        const ok = await addToCart(product.id, 1, product.name);
        setState(ok ? "done" : "idle");
      }}
      accessibilityRole="button"
      accessibilityLabel={done ? `${product.name} en tu canasta` : `Rescatar ${product.name}, agregar 1 ${product.unit} a la canasta`}
      style={{
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: spacing[4],
        borderRadius: radius.full,
        backgroundColor: done ? AMBER : INK,
        opacity: state === "busy" ? 0.7 : 1,
      }}
    >
      <Icon name={done ? "checkmark" : "leaf"} size={16} color="#163020" />
      <Text style={[type.callout, { color: "#163020", fontWeight: "800" }]}>{done ? "En tu canasta" : "Rescatar"}</Text>
    </PressableScale>
  );
}
