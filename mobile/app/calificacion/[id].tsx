import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "../../src/components/TopBar";
import { Button } from "../../src/components/Button";
import { Stars, starFeedback } from "../../src/components/Stars";
import { Pill } from "../../src/components/Pill";
import { Icon } from "../../src/components/Icon";
import { orderSavings } from "../../src/lib/savings";
import { showAlert } from "../../src/lib/dialog";
import { toast } from "../../src/store/toast";
import { useAuth } from "../../src/store/auth";
import { fontSize, radius, spacing, useTheme, formatCOP, shadow } from "../../src/theme";
import { getOrder, createReview, apiErrorMessage } from "../../src/api/client";
import { ProducerSummary } from "../../src/api/types";

import { ErrorState, LoadingState } from "../../src/components/QueryState";
interface RatingEntry {
  toUserId: string;
  name: string;
  avatarIcon: string;
  /** Ya enviada (en un intento anterior o antes de entrar a la pantalla). */
  done?: boolean;
  role: "productor" | "repartidor";
  rating: number;
  comment: string;
}

export default function Calificacion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const meId = useAuth((s) => s.user?.id);

  const { data: order, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder(id!),
    enabled: !!id });

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
      avatarIcon: "preparing",
      role: "productor",
      rating: 0,
      comment: "" }));
    if (order.courier) {
      list.push({
        toUserId: order.courier.id,
        name: order.courier.name,
        avatarIcon: "in_transit",
        role: "repartidor",
        rating: 0,
        comment: "" });
    }
    // Quienes ya fueron calificados en este pedido no se vuelven a pedir
    const already = new Set(
      (order.reviews ?? []).filter((r) => r.fromUserId === meId).map((r) => r.toUserId)
    );
    return list.filter((e) => !already.has(e.toUserId));
  }, [order, meId]);

  // Sincronizar entries cuando llega la orden (una sola vez)
  if (!initialized && order) {
    setEntries(targets);
    setInitialized(true);
  }

  if (isLoading || !order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
        <TopBar showBack onBack={() => router.back()} title="Calificar" />
        <View style={{ flex: 1, justifyContent: "center" }}>
          {error ? (
            <ErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} />
          ) : (
            <LoadingState label="Cargando tu pedido…" />
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (order.status !== "DELIVERED") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
        <TopBar showBack onBack={() => router.back()} title="Calificar" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing[6], gap: spacing[3] }}>
          <Icon name="hourglass-outline" size={56} color={t.textTertiary} />
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

  const pending = entries.filter((e) => !e.done);
  const allRated = pending.length > 0 && pending.every((e) => e.rating > 0);

  const onSubmit = async () => {
    if (!allRated) {
      showAlert("Faltan estrellas", "Califica a todos con al menos 1 estrella para enviar.");
      return;
    }
    setSubmitting(true);
    try {
      // Una por una: si alguna falla, las ya enviadas quedan marcadas y no se repiten
      for (const e of pending) {
        await createReview(order.id, {
          rating: e.rating,
          comment: e.comment.trim() || undefined,
          toUserId: e.toUserId });
        updateEntry(e.toUserId, { done: true });
      }
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("¡Gracias! Tu calificación ayuda a otros compradores");
      router.replace("/(tabs)/home");
    } catch (err) {
      showAlert("Error al enviar", apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const savings = orderSavings(order);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
      <TopBar showBack onBack={() => router.back()} title="Calificar pedido" />

      <ScrollView contentContainerStyle={{ paddingBottom: 150 + insets.bottom }}>
        {/* ═══ Success hero ═══ */}
        <View
          style={{
            backgroundColor: t.bgPrimary,
            paddingVertical: spacing[10],
            paddingHorizontal: spacing[6],
            alignItems: "center" }}
        >
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: radius.full,
              backgroundColor: t.successLight,
                            alignItems: "center",
              justifyContent: "center",
              marginBottom: spacing[4] }}
          >
            <Icon name="checkmark-circle" size={48} color={t.success} />
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
        {entries.length === 0 ? (
          <View style={{ margin: spacing[4], padding: spacing[5], alignItems: "center", gap: spacing[2] }}>
            <Icon name="star" size={32} color={t.warning} />
            <Text style={{ color: t.textSecondary, textAlign: "center" }}>
              Ya calificaste a todos los participantes de este pedido. ¡Gracias!
            </Text>
          </View>
        ) : null}

        {entries.map((entry) => (
          <View
            key={entry.toUserId}
            style={{
              backgroundColor: t.bgPrimary,
              borderRadius: radius.xl,
              marginHorizontal: spacing[4],
              marginTop: spacing[4],
              padding: spacing[5],
              ...shadow.md }}
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
                  justifyContent: "center" }}
              >
                <Icon name={entry.avatarIcon} size={26} color={t.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: t.textPrimary }}>
                  {entry.name}
                </Text>
                <Text style={{ fontSize: 12, color: t.textSecondary, textTransform: "capitalize" }}>
                  {entry.role}
                </Text>
              </View>
              {entry.done ? (
                <Pill variant="success" icon="checkmark-circle">
                  Enviada
                </Pill>
              ) : null}
              <View>
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
                marginBottom: spacing[4] }}
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
                textAlignVertical: "top" }}
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
            gap: spacing[3] }}
        >
          <Icon name="heart" size={28} color={t.primary} />
          <Text style={{ flex: 1, fontSize: 13, color: t.textSecondary, lineHeight: 18 }}>
            {savings > 0 ? (
              <>
                Al comprar directo al productor, <Text style={{ fontWeight: "700", color: t.primary }}>ahorraste {formatCOP(savings)}</Text> frente a la plaza de mercado, y el productor recibió el valor completo de su cosecha.
              </>
            ) : (
              "Al comprar directo al productor, él recibió el valor completo de su cosecha."
            )}
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
          paddingBottom: spacing[2] + insets.bottom,
          backgroundColor: t.bgPrimary,
          borderTopWidth: 1,
          borderTopColor: t.border,
          ...shadow.lg }}
      >
        <Button
          title={submitting ? "Enviando..." : "Enviar calificación"}
          onPress={onSubmit}
          disabled={!allRated || submitting}
          loading={submitting}
          full
          size="lg"
        />
        <Pressable onPress={() => router.replace("/(tabs)/home")} style={{ minHeight: 48, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: t.textTertiary, fontSize: fontSize.sm }}>
            {entries.length === 0 ? "Volver al inicio" : "Omitir por ahora"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
