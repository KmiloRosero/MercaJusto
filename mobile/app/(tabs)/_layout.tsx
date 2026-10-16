import React, { useEffect, useRef } from "react";
import { ColorValue, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/store/auth";
import { motion, nav, useTheme } from "../../src/theme";
import { useCart } from "../../src/store/cart";
import { Icon, IconName } from "../../src/components/Icon";

export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // Productos distintos, no unidades: 3 kg de papa cuentan como un producto.
  const cartCount = useCart((s) => s.items.length);
  const fetchCart = useCart((s) => s.fetch);
  const role = useAuth((s) => s.user?.role);
  const isBuyer = role === "BUYER";

  // Cargar la canasta al entrar para que el badge esté al día
  React.useEffect(() => {
    if (isBuyer) fetchCart();
  }, [isBuyer, fetchCart]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textTertiary,
        tabBarStyle: {
          backgroundColor: t.bgPrimary,
          borderTopColor: t.border,
          height: nav.bottomHeight + insets.bottom,
          paddingTop: 6,
          paddingBottom: 6 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={focused ? "home" : "home-outline"} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Buscar",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={focused ? "search" : "search-outline"} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Canasta",
          // Solo los compradores arman canasta
          href: isBuyer ? undefined : null,
          tabBarAccessibilityLabel:
            cartCount > 0 ? `Canasta, ${cartCount} producto${cartCount !== 1 ? "s" : ""}` : "Canasta",
          tabBarIcon: ({ color, focused }) => (
            <View>
              <TabIcon icon={focused ? "cart" : "cart-outline"} color={color} focused={focused} />
              <CartBadge count={cartCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: isBuyer ? "Pedidos" : role === "COURIER" ? "Entregas" : "Ventas",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={focused ? "receipt" : "receipt-outline"} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={focused ? "person" : "person-outline"} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ icon, color, focused }: { icon: IconName; color: ColorValue; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", transform: [{ scale: focused ? 1.1 : 1 }] }}>
      <Icon name={icon} size={22} color={color as string} />
    </View>
  );
}

/**
 * Insignia de la canasta. Da un salto corto cuando entra un producto, para
 * confirmar desde cualquier pantalla que se agregó; al quitar no se mueve.
 */
function CartBadge({ count }: { count: number }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const previous = useRef(count);

  useEffect(() => {
    if (count > previous.current && !reduceMotion) {
      scale.set(
        withSequence(
          withTiming(1.3, { duration: 140, easing: Easing.bezier(...motion.easeOut) }),
          withSpring(1, motion.release)
        )
      );
    }
    previous.current = count;
  }, [count, reduceMotion, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (count <= 0) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: -6,
          right: -12,
          minWidth: 18,
          height: 18,
          paddingHorizontal: 4,
          borderRadius: 9,
          backgroundColor: t.primary,
          borderWidth: 1.5,
          borderColor: t.bgPrimary,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text style={{ color: t.onPrimary, fontSize: 10, lineHeight: 12, fontWeight: "800" }}>
        {count > 99 ? "99+" : count}
      </Text>
    </Animated.View>
  );
}
