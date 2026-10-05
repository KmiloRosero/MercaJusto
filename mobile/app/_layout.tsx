import React, { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuth } from "../src/store/auth";
import { registerPushToken } from "../src/api/client";
import { registerForPushNotifications } from "../src/lib/notifications";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default function RootLayout() {
  const bootstrap = useAuth((s) => s.bootstrap);
  const hydrated = useAuth((s) => s.hydrated);
  const userId = useAuth((s) => s.user?.id);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Registrar el Expo Push Token cuando hay una sesión activa
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const token = await registerForPushNotifications();
      if (cancelled || !token) return;
      const platform =
        Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "unknown";
      try {
        await registerPushToken(token, platform);
      } catch {
        // no crítico: el backend igual funciona sin push
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#FFFFFF" },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="producto/[id]" />
            <Stack.Screen name="checkout" />
            <Stack.Screen name="seguimiento/[id]" />
            <Stack.Screen name="calificacion/[id]" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
