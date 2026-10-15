import React, { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isRetryableError , registerPushToken } from "../src/api/client";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuth } from "../src/store/auth";

import { registerForPushNotifications } from "../src/lib/notifications";
import { useTheme, useThemeScheme } from "../src/theme";
import { Toast } from "../src/components/Toast";
import { AnimatedSplash } from "../src/components/AnimatedSplash";

// El splash nativo se mantiene hasta que el splash animado tome el relevo.
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    // Con señal débil un fallo aislado no debe vaciar la pantalla: se reintenta
    // dos veces, pero nunca un 4xx (eso no se arregla reintentando).
    queries: { staleTime: 30_000, retry: (count, err) => count < 2 && isRetryableError(err) },
  },
});

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const bootstrap = useAuth((s) => s.bootstrap);
  const hydrated = useAuth((s) => s.hydrated);
  const userId = useAuth((s) => s.user?.id);
  const setPushToken = useAuth((s) => s.setPushToken);
  const themeScheme = useThemeScheme();
  const t = useTheme();
  const [splashVisible, setSplashVisible] = useState(true);
  const hideSplash = useCallback(() => setSplashVisible(false), []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Sin sesión (logout o token expirado) → volver al onboarding
  useEffect(() => {
    if (!hydrated) return;
    const first = segments[0] as string | undefined;
    if (!userId && first && first !== "(auth)") {
      queryClient.clear();
      router.replace("/(auth)/onboarding");
    }
  }, [hydrated, userId, segments, router]);

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
        setPushToken(token);
      } catch {
        // no crítico: el backend igual funciona sin push
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, setPushToken]);

  // Al tocar una notificación de pedido, abrir su seguimiento
  useEffect(() => {
    if (Platform.OS === "web" || !userId) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const orderId = response.notification.request.content.data?.orderId;
      if (typeof orderId === "string") {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        router.push(`/seguimiento/${orderId}`);
      }
    });
    return () => sub.remove();
  }, [userId, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={splashVisible || themeScheme === "dark" ? "light" : "dark"} />
          {hydrated ? (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: t.bgPrimary },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="producto/[id]" />
            <Stack.Screen name="productor/[id]" />
            <Stack.Screen name="checkout" />
            <Stack.Screen name="seguimiento/[id]" />
            <Stack.Screen name="calificacion/[id]" />
          </Stack>
          ) : null}
          <Toast />
          {splashVisible ? <AnimatedSplash ready={hydrated} onFinish={hideSplash} /> : null}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
