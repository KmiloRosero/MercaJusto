import React from "react";
import { Text, View } from "react-native";
import { Tabs } from "expo-router";
import { useTheme } from "../../src/theme";
import { useCart } from "../../src/store/cart";

export default function TabsLayout() {
  const t = useTheme();
  const cartCount = useCart((s) => s.items.reduce((acc, i) => acc + i.quantity, 0));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textTertiary,
        tabBarStyle: {
          backgroundColor: t.bgPrimary,
          borderTopColor: t.border,
          height: 64,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, focused }) => <TabIcon icon="🏠" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Buscar",
          tabBarIcon: ({ color, focused }) => <TabIcon icon="🔍" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Canasta",
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: { backgroundColor: t.accent, fontSize: 10 },
          tabBarIcon: ({ color, focused }) => <TabIcon icon="🛒" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Pedidos",
          tabBarIcon: ({ color, focused }) => <TabIcon icon="📦" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, focused }) => <TabIcon icon="👤" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ icon, color, focused }: { icon: string; color: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: focused ? 24 : 22, opacity: focused ? 1 : 0.6 }}>{icon}</Text>
    </View>
  );
}
