import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "../../src/components/TopBar";
import { Button } from "../../src/components/Button";
import { Stars, starFeedback } from "../../src/components/Stars";
import { Pill } from "../../src/components/Pill";
import { fontSize, radius, spacing, useTheme, formatCOP, shadow } from "../../src/theme";
import { getOrder, createReview, apiErrorMessage } from "../../src/api/client";
import { ProducerSummary } from "../../src/api/types";

interface RatingEntry {
  toUserId: string;
  name: string;
  avatarIcon: string;
  role: "productor" | "repartidor";
  rating: number;
  comment: string;
}

export default function Calificacion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder(id!),
    enabled: !!id,
  });

  const [entries, setEntries] = useState<RatingEntry[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Construir la lista de personas a calificar (productores únicos + repartidor)
  const targets = useMemo<RatingEntry[]>(() => {
    if (!order) return [];
    const producerMap = new Map<string, ProducerSummary>();
    for (const it of order.items) {
      const p = it.product?.producer;
      if (p && !producerMap.has(p.id)) producerMap.set(p.id, p);
    }
    const list: RatingEntry[] = Array.from(producerMap.values()).map((p) => ({
      toUserId: p.id,
      name: p.name,
      avatarIcon: "👨‍🌾",
      role: "productor",
      rating: 0,
      comment: "",
    }));
    if (order.courier) {
      list.push({
        toUserId: order.courier.id,
        name: order.courier.name,
        avatarIcon: "🚚",
        role: "repartidor",
        rating: 0,
        comment: "",
      });
    }
    return list;
  }, [order]);

  // Sincronizar entries cuando llega la orden (una sola vez)
  if (!initialized && targets.length > 0) {
    setEntries(targets);
    setInitialized(true);
  }

  if (isLoading || !order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
        <TopBar showBack onBack={() => router.back()} title="Calificar" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={t.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (order.status !== "DELIVERED") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
        <TopBar showBack onBack={() => router.back()} title="Calificar" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing[6], gap: spacing[3] }}>
          <Text style={{ fontSize: 64 }}>⏳</Text>
          <Text style={{ fontSize: fontSize.xl, fontWeight: "800", color: t.textPrimary, textAlign: "center" }}>
            Aún no puedes calificar
          </Text>
          <Text style={{ color: t.textSecondary, textAlign: "center" }}>
            Solo puedes calificar pedidos entregados. Este pedido está en estado: {order.status}.
          </Text>
          <Button title="Ver seguimiento" onPress={() => router.replace(`/seguimiento/${order.id}`)} />
        </View>
      </SafeAreaView>
    );
  }

  const updateEntry = (toUserId: string, patch: Partial<RatingEntry>) => {
    setEntries((prev) => prev.map((e) => (e.toUserId === toUserId ? { ...e, ...patch } : e)));
  };

  const allRated = entries.length > 0 && entries.every((e) => e.rating > 0);

  const onSubmit = async () => {
    if (!allRated) {
      Alert.alert("Faltan estrellas", "Califica a todos con al menos 1 estrella para enviar.");
      return;
    }
    setSubmitting(true);
    try {
      for (const e of entries) {
        await createReview(order.id, {
          rating: e.rating,
          comment: e.comment.trim() || undefined,
          toUserId: e.toUserId,
        });
      }
      Alert.alert("¡Gracias! 🌟", "Tu calificación ayuda a otros compradores y motiva al productor.", [
        { text: "OK", onPress: () => router.replace("/(tabs)/home") },
      ]);
    } catch (err) {
      Alert.alert("Error al enviar", apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
      <TopBar showBack onBack={() => router.back()} title="Calificar pedido" />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ═══ Success hero ═══ */}
        <View
          style={{
            backgroundColor: t.bgPrimary,
            paddingVertical: spacing[10],
            paddingHorizontal: spacing[6],
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: radius.full,
              backgroundColor: "rgba(45,198,83,0.15)",
              borderWidth: 3,
              borderColor: "rgba(45,198,83,0.3)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: spacing[4],
            }}
          >
            <Text style={{ fontSize: 44 }}>✅</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: t.textPrimary, marginBottom: spacing[2] }}>
            ¡Pedido recibido!
          </Text>
          <Text style={{ fontSize: 14, color: t.textSecondary, textAlign: "center", lineHeight: 20, maxWidth: 280 }}>
            Tu cosecha fresca llegó. Cuéntanos cómo fue tu experiencia para ayudar a otros compradores.
          </Text>
          <View style={{ marginTop: spacing[3] }}>
            <Pill variant="success">#{order.id.slice(-8).toUpperCase()} · {formatCOP(order.total)}</Pill>
          </View>
        </View>

        {/* ═══ Rating cards por persona ═══ */}
        {entries.map((entry) => (
          <View
            key={entry.toUserId}
            style={{
              backgroundColor: t.bgPrimary,
              borderRadius: radius.xl,
              marginHorizontal: spacing[4],
              marginTop: spacing[4],
              padding: spacing[5],
              ...shadow.md,
            }}
          >
            {/* Seller summary */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3], marginBottom: spacing[4] }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: radius.full,
                  backgroundColor: t.primary10,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 26 }}>{entry.avatarIcon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: t.textPrimary }}>
                  {entry.name}
                </Text>
                <Text style={{ fontSize: 12, color: t.textSecondary, textTransform: "capitalize" }}>
                  {entry.role}
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 16, fontWeight: "700", color: t.textPrimary, textAlign: "center", marginBottom: spacing[4] }}>
              ¿Cómo fue tu experiencia?
            </Text>

            <Stars
              rating={entry.rating}
              onChange={(r) => updateEntry(entry.toUserId, { rating: r })}
              size={40}
            />

            <Text
              style={{
                textAlign: "center",
                fontSize: 14,
                fontWeight: "600",
                color: t.warning,
                minHeight: 20,
                marginTop: spacing[3],
                marginBottom: spacing[4],
              }}
            >
              {entry.rating > 0 ? starFeedback(entry.rating) : "Toca las estrellas para calificar"}
            </Text>

            <TextInput
              value={entry.comment}
              onChangeText={(c) => updateEntry(entry.toUserId, { comment: c })}
              placeholder="Escribe un comentario (opcional)..."
              placeholderTextColor={t.textTertiary}
              multiline
              maxLength={500}
              style={{
                width: "100%",
                minHeight: 80,
                borderWidth: 1.5,
                borderColor: t.border,
                borderRadius: radius.lg,
                padding: spacing[3],
                paddingHorizontal: spacing[4],
                fontSize: 14,
                color: t.textPrimary,
                backgroundColor: t.bgInput,
                textAlignVertical: "top",
              }}
            />
            <Text style={{ fontSize: 11, color: t.textTertiary, textAlign: "right", marginTop: 4 }}>
              {entry.comment.length}/500
            </Text>
          </View>
        ))}

        {/* ═══ Tip de impacto ═══ */}
        <View
          style={{
            marginHorizontal: spacing[4],
            marginTop: spacing[4],
            padding: spacing[4],
            borderRadius: radius.lg,
            backgroundColor: t.primaryLight,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
          }}
        >
          <Text style={{ fontSize: 28 }}>💚</Text>
          <Text style={{ flex: 1, fontSize: 13, color: t.textSecondary, lineHeight: 18 }}>
            Al comprar directo al productor, <Text style={{ fontWeight: "700", color: t.primary }}>ahorraste ~{formatCOP(Math.round(order.subtotal * 0.35))}</Text> frente a una tienda tradicional, y el productor recibió hasta 4x más que con intermediarios.
          </Text>
        </View>
      </ScrollView>

      {/* ═══ CTA fijo ═══ */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: spacing[4],
          backgroundColor: t.bgPrimary,
          borderTopWidth: 1,
          borderTopColor: t.border,
          ...shadow.lg,
        }}
      >
        <Button
          title={submitting ? "Enviando..." : "Enviar calificación"}
          onPress={onSubmit}
          disabled={!allRated || submitting}
          loading={submitting}
          full
          size="lg"
        />
        <Pressable onPress={() => router.replace("/(tabs)/home")} style={{ padding: spacing[2], alignItems: "center" }}>
          <Text style={{ color: t.textTertiary, fontSize: fontSize.sm }}>Omitir por ahora</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
