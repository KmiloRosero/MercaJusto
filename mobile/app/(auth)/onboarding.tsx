import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { fontSize, radius, spacing, useTheme } from "../../src/theme";

type Role = "BUYER" | "PRODUCER";

const slides = [
  {
    emoji: "🌾",
    title: "Del campo directo\na tu mesa",
    body: "Conectamos campesinos de Nariño con compradores de la ciudad. Sin intermediarios.",
  },
  {
    emoji: "🚚",
    title: "Rutas de entrega\ninteligentes",
    body: "Agrupamos pedidos por zona para que un solo repartidor entregue varios y el envío sea barato.",
  },
  {
    emoji: "💚",
    title: "Precio justo,\nconfianza real",
    body: "El productor recibe hasta 4 veces más que con el intermediario. Tú pagas menos que en la tienda.",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const [role, setRole] = useState<Role | null>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  };

  const next = () => {
    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      router.push({ pathname: "/(auth)/login", params: { role: role || "BUYER" } });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }}>
      <FlatList
        ref={listRef as never}
        data={slides}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View
            style={{
              width,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: spacing[6],
              gap: spacing[5],
            }}
          >
            <Text style={{ fontSize: 100 }}>{item.emoji}</Text>
            <Text
              style={{
                fontSize: 28,
                fontWeight: "800",
                color: t.textPrimary,
                textAlign: "center",
                lineHeight: 34,
              }}
            >
              {item.title}
            </Text>
            <Text
              style={{
                fontSize: fontSize.base,
                color: t.textSecondary,
                textAlign: "center",
                lineHeight: 22,
                maxWidth: 320,
              }}
            >
              {item.body}
            </Text>
          </View>
        )}
      />

      {/* Indicadores */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
          marginBottom: spacing[6],
        }}
      >
        {slides.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === index ? 24 : 8,
              height: 8,
              borderRadius: radius.full,
              backgroundColor: i === index ? t.primary : t.gray200,
            }}
          />
        ))}
      </View>

      {/* Selector de rol en el último slide */}
      {index === slides.length - 1 ? (
        <View style={{ paddingHorizontal: spacing[4], marginBottom: spacing[4], gap: spacing[3] }}>
          <Text
            style={{
              fontSize: fontSize.sm,
              color: t.textSecondary,
              textAlign: "center",
              fontWeight: "600",
            }}
          >
            ¿Cómo quieres usar MercaJusto?
          </Text>
          <View style={{ flexDirection: "row", gap: spacing[3] }}>
            <RoleCard
              icon="🛍️"
              title="Comprar"
              subtitle="Soy comprador"
              active={role === "BUYER"}
              onPress={() => setRole("BUYER")}
            />
            <RoleCard
              icon="👨‍🌾"
              title="Vender"
              subtitle="Soy productor"
              active={role === "PRODUCER"}
              onPress={() => setRole("PRODUCER")}
            />
          </View>
        </View>
      ) : null}

      <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[6] }}>
        <Button
          title={index === slides.length - 1 ? "Continuar" : "Siguiente"}
          onPress={next}
          full
          disabled={index === slides.length - 1 && !role}
          size="lg"
        />
        <Pressable
          onPress={() => router.push({ pathname: "/(auth)/login", params: { role: role || "BUYER" } })}
          style={{ padding: spacing[3], alignItems: "center" }}
        >
          <Text style={{ color: t.textTertiary, fontSize: fontSize.sm }}>Ya tengo cuenta</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function RoleCard({
  icon,
  title,
  subtitle,
  active,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  active: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        padding: spacing[4],
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: active ? t.primary : t.border,
        backgroundColor: active ? t.primaryLight : t.bgPrimary,
        alignItems: "center",
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 32 }}>{icon}</Text>
      <Text style={{ fontSize: fontSize.base, fontWeight: "700", color: t.textPrimary }}>
        {title}
      </Text>
      <Text style={{ fontSize: fontSize.xs, color: t.textSecondary }}>{subtitle}</Text>
    </Pressable>
  );
}
