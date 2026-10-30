import React, { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, SlideInDown, SlideOutDown, useReducedMotion } from "react-native-reanimated";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatCOP, motion, radius, spacing, useTheme } from "../theme";
import { useDockInset } from "./ui/Dock";
import { useCart } from "../store/cart";
import { useToast } from "../store/toast";
import { useAuth } from "../store/auth";
import { PressableScale } from "./PressableScale";
import { Icon } from "./Icon";

/**
 * Barra flotante "Ver canasta" sobre el contenido, como en las apps de
 * domicilio: aparece con el primer producto y lleva a la canasta.
 * En una pestaña va justo encima de la barra de pestañas; fuera de ellas,
 * encima del área segura.
 */
export function CartBar({ overTabs }: { overTabs?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const dockInset = useDockInset();
  // En una pestaña va sobre el dock, que flota encima de la pantalla.
  const bottom = overTabs ? dockInset : insets.bottom;
  // El snackbar se mide desde el borde de la ventana.
  const below = bottom;
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const isBuyer = useAuth((s) => s.user?.role === "BUYER");
  const count = useCart((s) => s.items.length);
  const subtotal = useCart((s) => s.subtotal);
  const loaded = useCart((s) => s.loaded);
  const loading = useCart((s) => s.loading);
  const fetchCart = useCart((s) => s.fetch);
  const setAnchor = useToast((s) => s.setAnchor);
  const [height, setHeight] = useState(0);
  const [focused, setFocused] = useState(false);
  const visible = isBuyer && count > 0;

  // Si se llega directo a una pantalla fuera de las pestañas, la canasta aún no cargó.
  useEffect(() => {
    if (isBuyer && !loaded && !loading) fetchCart();
  }, [isBuyer, loaded, loading, fetchCart]);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  // El snackbar se ancla encima de la barra mientras se ve.
  useEffect(() => {
    if (!focused) return;
    setAnchor(visible && height ? below + height + spacing[3] : null);
    return () => setAnchor(null);
  }, [focused, visible, height, below, setAnchor]);

  if (!visible) return null;

  const easing = Easing.bezier(...motion.drawer);
  return (
    <Animated.View
      entering={reduceMotion ? undefined : SlideInDown.duration(280).easing(easing)}
      exiting={reduceMotion ? undefined : SlideOutDown.duration(180)}
      onLayout={(e) => setHeight(e.nativeEvent.layout.height + spacing[2])}
      pointerEvents="box-none"
      style={{ position: "absolute", left: spacing[4], right: spacing[4], bottom: bottom + spacing[2] }}
    >
      <PressableScale
        onPress={() => router.push("/(tabs)/cart")}
        accessibilityRole="button"
        accessibilityLabel={`Ver canasta, ${count} producto${count !== 1 ? "s" : ""}, ${formatCOP(subtotal)}`}
        style={{
          height: 56,
          borderRadius: radius.lg,
          backgroundColor: t.primary,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing[4],
          gap: spacing[3],
          maxWidth: 560,
          width: "100%",
          alignSelf: "center",
          shadowColor: "#0A140E",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.22,
          shadowRadius: 18,
          elevation: 8,
        }}
      >
        <View
          style={{
            minWidth: 28,
            height: 28,
            paddingHorizontal: 6,
            borderRadius: radius.full,
            backgroundColor: t.onPrimary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: t.primary, fontSize: 14, fontWeight: "800" }}>{count > 99 ? "99+" : count}</Text>
        </View>
        <Text style={{ flex: 1, color: t.onPrimary, fontSize: 16, fontWeight: "800" }}>Ver canasta</Text>
        <Text style={{ color: t.onPrimary, fontSize: 16, fontWeight: "800" }}>{formatCOP(subtotal)}</Text>
        <Icon name="chevron-forward" size={18} color={t.onPrimary} />
      </PressableScale>
    </Animated.View>
  );
}
