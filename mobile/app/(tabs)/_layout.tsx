import React from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/store/auth";
import { useTheme } from "../../src/theme";
import { useCart } from "../../src/store/cart";
import { Icon, IconName } from "../../src/components/Icon";

export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const cartCount = useCart((s) => s.items.reduce((acc, i) => acc + i.quantity, 0));
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
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
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
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: { backgroundColor: t.accent, fontSize: 10, fontWeight: "800" },
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={focused ? "cart" : "cart-outline"} color={color} focused={focused} />
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

export const TAB_BAR_HEIGHT = 64;

function TabIcon({ icon, color, focused }: { icon: IconName; color: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", transform: [{ scale: focused ? 1.1 : 1 }] }}>
      <Icon name={icon} size={22} color={color} />
    </View>
  );
}
