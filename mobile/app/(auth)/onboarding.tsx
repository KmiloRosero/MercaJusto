import React, { useRef, useState } from "react";
import {
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
import { Icon, IconName } from "../../src/components/Icon";
import { fontSize, radius, spacing, useTheme } from "../../src/theme";

type Role = "BUYER" | "PRODUCER";

const slides: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: "leaf",
    title: "Del campo directo\na tu mesa",
    body: "Conectamos pequeños productores campesinos de Nariño con compradores de la ciudad. Sin intermediarios.",
  },
  {
    icon: "in_transit",
    title: "Rutas de entrega\ninteligentes",
    body: "Agrupamos pedidos por zona geográfica para que la entrega sea rápida, eficiente y muy económica.",
  },
  {
    icon: "shield-checkmark-outline",
    title: "Precio justo,\nconfianza real",
    body: "El productor recibe una retribución digna y tú pagas menos que en las tiendas y mercados tradicionales.",
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
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: radius.full,
                backgroundColor: t.primaryLight,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: t.primary,
              }}
            >
              <Icon name={item.icon} size={64} color={t.primary} />
            </View>
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
              fontWeight: "700",
            }}
          >
            ¿Cómo deseas ingresar a MercaJusto?
          </Text>
          <View style={{ flexDirection: "row", gap: spacing[3] }}>
            <RoleCard
              icon="cart"
              title="Comprar"
              subtitle="Soy comprador"
              active={role === "BUYER"}
              onPress={() => setRole("BUYER")}
            />
            <RoleCard
              icon="preparing"
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
          icon={<Icon name="arrow-forward" size={18} color="#FFFFFF" />}
          onPress={next}
          full
          disabled={index === slides.length - 1 && !role}
          size="lg"
        />
        <Pressable
          onPress={() => router.push({ pathname: "/(auth)/login", params: { role: role || "BUYER" } })}
          style={{ padding: spacing[3], alignItems: "center" }}
        >
          <Text style={{ color: t.textTertiary, fontSize: fontSize.sm, fontWeight: "600" }}>Ya tengo una cuenta</Text>
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
  icon: IconName;
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
        gap: 6,
      }}
    >
      <Icon name={icon} size={32} color={active ? t.primary : t.textSecondary} />
      <Text style={{ fontSize: fontSize.base, fontWeight: "800", color: t.textPrimary }}>
        {title}
      </Text>
      <Text style={{ fontSize: fontSize.xs, color: t.textSecondary, fontWeight: "600" }}>{subtitle}</Text>
    </Pressable>
  );
}
