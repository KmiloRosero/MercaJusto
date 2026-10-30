import React, { useEffect, useState } from "react";
import { Platform, Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { motion, nav, shadow, useTheme, useThemeScheme } from "../../theme";
import { tapLight } from "../../lib/haptics";

export type DockProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>>[0];

const PILL_HEIGHT = 62;
const GAP_BELOW = 10;
const ease = Easing.bezier(...motion.easeOut);
// Resorte del dock: el ícono crece rápido y se asienta sin rebotar mucho.
const lift = { damping: 14, stiffness: 300 };

/**
 * Barra de pestañas flotante tipo dock: una cápsula de vidrio separada del
 * borde. La pestaña activa lleva un fondo verde que se desliza entre pestañas
 * y un punto debajo; al tocar (o pasar el mouse en la web) el ícono crece e
 * inclina un poco. Mide lo mismo que `nav.bottomHeight` + área segura, así
 * que la canasta y los avisos siguen quedando justo encima.
 */
export function Dock({ state, descriptors, navigation }: DockProps) {
  const t = useTheme();
  const scheme = useThemeScheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const routes = state.routes.filter((r) => {
    const style = descriptors[r.key]?.options.tabBarItemStyle as { display?: string } | undefined;
    return style?.display !== "none";
  });
  const activeKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(0, routes.findIndex((r) => r.key === activeKey));

  // Fondo de la pestaña activa: se desliza al cambiar de pestaña.
  const [slot, setSlot] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (!slot) return;
    const target = activeIndex * slot;
    x.set(reduceMotion ? target : withTiming(target, { duration: 260, easing: ease }));
  }, [activeIndex, slot, reduceMotion, x]);
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  // Flota muy despacio, 2 px, como el dock del diseño. Quieto con movimiento reducido.
  const float = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    float.set(withRepeat(withSequence(withTiming(-2, { duration: 4000 }), withTiming(0, { duration: 4000 })), -1));
  }, [reduceMotion, float]);
  const floating = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));

  const onRowLayout = (e: LayoutChangeEvent) => setSlot(e.nativeEvent.layout.width / Math.max(1, routes.length));
  const glass = scheme === "dark" ? "rgba(22,22,22,0.86)" : "rgba(255,255,255,0.86)";

  return (
    <View
      style={{
        height: nav.bottomHeight + insets.bottom,
        paddingHorizontal: 16,
        paddingBottom: insets.bottom + GAP_BELOW,
        justifyContent: "flex-end",
        backgroundColor: "transparent",
      }}
    >
      <Animated.View
        style={[
          {
            height: PILL_HEIGHT,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: glass,
            paddingHorizontal: 6,
            justifyContent: "center",
            ...shadow.lg,
          },
          Platform.OS === "web" ? ({ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" } as object) : null,
          floating,
        ]}
      >
        <View accessibilityRole="tablist" onLayout={onRowLayout} style={{ flexDirection: "row", alignItems: "center" }}>
          {slot > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                { position: "absolute", left: 0, top: 0, bottom: 0, width: slot, alignItems: "center", justifyContent: "center" },
                indicator,
              ]}
            >
              <View style={{ width: Math.min(slot - 6, 72), height: PILL_HEIGHT - 12, borderRadius: 20, backgroundColor: t.primaryLight }} />
            </Animated.View>
          ) : null}
          {routes.map((route) => {
            const { options } = descriptors[route.key]!;
            const focused = route.key === activeKey;
            const label = typeof options.title === "string" ? options.title : route.name;
            const color = focused ? t.primary : t.textTertiary;
            const onPress = () => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                tapLight();
                navigation.navigate(route.name, route.params);
              }
            };
            return (
              <DockItem
                key={route.key}
                label={label}
                focused={focused}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                onPress={onPress}
                onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
              >
                {options.tabBarIcon?.({ focused, color, size: 22 })}
              </DockItem>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

function DockItem({
  label,
  focused,
  accessibilityLabel,
  onPress,
  onLongPress,
  children,
}: {
  label: string;
  focused: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  onLongPress: () => void;
  children: React.ReactNode;
}) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const grow = useSharedValue(0);
  const dot = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    dot.set(reduceMotion ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: 200, easing: ease }));
  }, [focused, reduceMotion, dot]);

  const up = () => {
    if (!reduceMotion) grow.set(withSpring(1, lift));
  };
  const down = () => grow.set(withSpring(0, motion.release));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -3 * grow.value },
      { scale: 1 + 0.2 * grow.value },
      { rotate: `${-5 * grow.value}deg` },
    ],
  }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: dot.value, transform: [{ scale: 0.4 + 0.6 * dot.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={up}
      onPressOut={down}
      onHoverIn={up}
      onHoverOut={down}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      style={{ flex: 1, height: PILL_HEIGHT - 12, alignItems: "center", justifyContent: "center", gap: 1, paddingTop: 3 }}
    >
      <Animated.View style={iconStyle}>{children}</Animated.View>
      <Text
        numberOfLines={1}
        style={{ fontSize: 11, lineHeight: 14, fontWeight: focused ? "800" : "600", color: focused ? t.onPrimaryLight : t.textSecondary }}
      >
        {label}
      </Text>
      <Animated.View
        style={[{ width: 4, height: 4, marginTop: 1, borderRadius: 2, backgroundColor: t.primary }, dotStyle]}
      />
    </Pressable>
  );
}
