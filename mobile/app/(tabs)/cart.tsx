import React, { useEffect } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { TopBar } from "../../src/components/TopBar";
import { Button } from "../../src/components/Button";
import { Pill } from "../../src/components/Pill";
import { Icon } from "../../src/components/Icon";
import { FieldTile } from "../../src/components/FieldTile";
import { fontSize, nav, radius, spacing, useTheme, formatCOP } from "../../src/theme";
import { useCart } from "../../src/store/cart";
import { cartSavings } from "../../src/lib/savings";
import { effectivePrice, orderTotals } from "../../src/lib/pricing";

import { SavingsNote } from "../../src/components/SavingsNote";
import { showAlert } from "../../src/lib/dialog";
import { ErrorState, LoadingState } from "../../src/components/QueryState";
import { QuantityStepper } from "../../src/components/QuantityStepper";
import { useSnackbarAnchor } from "../../src/lib/useSnackbarAnchor";

export default function Cart() {
  const router = useRouter();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // El resumen va sobre las pestañas: el snackbar se ancla encima de ambos.
  const onSummaryLayout = useSnackbarAnchor(nav.bottomHeight + insets.bottom);
  const { items, subtotal, fetch, updateQty, remove, pendingIds, error, loaded, loading, loadError } = useCart();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const groupedByProducer = items.reduce<Record<string, typeof items>>((acc, it) => {
    const key = it.product.producer?.id || "unknown";
    acc[key] = acc[key] || [];
    acc[key].push(it);
    return acc;
  }, {});

  const { deliveryFee, platformFee, total } = orderTotals(subtotal);
  const savings = cartSavings(items);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
      <TopBar title="Mi canasta" />
      {!loaded ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          {loadError ? (
            <ErrorState error={loadError} onRetry={fetch} retrying={loading} />
          ) : (
            <LoadingState label="Cargando tu canasta…" />
          )}
        </View>
      ) : null}
      {loaded && error ? (
        <Pressable
          onPress={() => useCart.setState({ error: null })}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[2],
            backgroundColor: t.dangerLight,
            marginHorizontal: spacing[4],
            marginTop: spacing[2],
            padding: spacing[3],
            borderRadius: radius.md,
          }}
        >
          <Icon name="alert-circle-outline" size={18} color={t.danger} />
          <Text style={{ flex: 1, color: t.danger, fontSize: fontSize.sm }}>{error}</Text>
          <Icon name="close" size={16} color={t.danger} />
        </Pressable>
      ) : null}

      {!loaded ? null : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing[6], gap: spacing[3] }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: radius.full,
              backgroundColor: t.bgPrimary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="cart-outline" size={44} color={t.textTertiary} />
          </View>
          <Text style={{ fontSize: fontSize.lg, fontWeight: "800", color: t.textPrimary }}>
            Tu canasta está vacía
          </Text>
          <Text style={{ color: t.textSecondary, textAlign: "center", fontSize: fontSize.sm, maxWidth: 280 }}>
            Explora cosechas frescas del campo nariñense y agrégalas a tu canasta.
          </Text>
          <Button title="Explorar productos" onPress={() => router.push("/(tabs)/home")} />
        </View>
      ) : (
        <>
          <FlatList
            data={Object.entries(groupedByProducer)}
            keyExtractor={([id]) => id}
            contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: 260 }}
            renderItem={({ item: [_, producerItems] }) => (
              <View
                style={{
                  backgroundColor: t.bgCard,
                  borderRadius: radius.lg,
                  padding: spacing[4],
                  gap: spacing[3],
                  borderWidth: 1,
                  borderColor: t.border,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
                  <Icon name="storefront" size={18} color={t.primary} />
                  <Text style={{ fontSize: fontSize.base, fontWeight: "700", color: t.textPrimary, flex: 1 }}>
                    {producerItems[0].product.producer?.name || "Productor"}
                  </Text>
                  <Pill variant="primary" icon="location-outline">
                    {producerItems[0].product.municipio}
                  </Pill>
                </View>

                {producerItems.map((it) => (
                  <View
                    key={it.id}
                    style={{
                      gap: spacing[2],
                      paddingVertical: spacing[2],
                      borderTopWidth: 1,
                      borderTopColor: t.border,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
                      <FieldTile category={it.product.category} size={52} iconSize={26} radius={radius.md} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: t.textPrimary }}>{it.product.name}</Text>
                        <Text style={{ fontSize: fontSize.sm, color: t.textSecondary, marginTop: 2 }}>
                          {formatCOP(effectivePrice(it.product))} / {it.product.unit}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: t.textPrimary }}>
                        {formatCOP(effectivePrice(it.product) * it.quantity)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Pressable
                        onPress={() => remove(it)}
                        disabled={!!pendingIds[it.id]}
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar ${it.product.name} de la canasta`}
                        style={({ pressed }) => ({
                          minHeight: 48,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          paddingRight: spacing[3],
                          opacity: pressed ? 0.6 : 1,
                        })}
                      >
                        <Icon name="trash-outline" size={18} color={t.danger} />
                        <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: t.danger }}>Quitar</Text>
                      </Pressable>
                      <QuantityStepper
                        value={it.quantity}
                        max={it.product.stock}
                        pending={!!pendingIds[it.id]}
                        label={it.product.name}
                        onChange={(q) => updateQty(it.id, q)}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          />

          <View
            onLayout={onSummaryLayout}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: t.bgCard,
              padding: spacing[4],
              borderTopWidth: 1,
              borderTopColor: t.border,
              gap: spacing[2],
            }}
          >
            <Row label="Subtotal" value={formatCOP(subtotal)} color={t.textPrimary} />
            <Row label="Envío agrupado" value={formatCOP(deliveryFee)} color={t.textSecondary} />
            <Pressable
              onPress={() =>
                showAlert(
                  "Comisión MercaJusto",
                  "El productor recibe completo el precio de su cosecha. El 5 % se suma aparte y sostiene la plataforma."
                )
              }
              accessibilityRole="button"
              accessibilityLabel={`Comisión MercaJusto, 5 %, ${formatCOP(platformFee)}. Toca para saber para qué es`}
              hitSlop={8}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 4, opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={{ fontSize: fontSize.sm, color: t.textSecondary }}>Comisión MercaJusto (5 %)</Text>
              <Icon name="information-circle-outline" size={16} color={t.textTertiary} />
              <Text style={{ flex: 1, textAlign: "right", fontSize: fontSize.sm, fontWeight: "600", color: t.textSecondary }}>
                {formatCOP(platformFee)}
              </Text>
            </Pressable>
            <View style={{ height: 1, backgroundColor: t.border, marginVertical: spacing[1] }} />
            <Row label="Total a pagar" value={formatCOP(total)} color={t.textPrimary} bold />
            <SavingsNote amount={savings} />
            <Button title="Proceder al pago" onPress={() => router.push("/checkout")} full size="lg" />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  color,
  bold,
  small,
}: {
  label: string;
  value: string;
  color: string;
  bold?: boolean;
  small?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ fontSize: small ? fontSize.xs : fontSize.sm, color }}>{label}</Text>
      <Text
        style={{
          fontSize: bold ? fontSize.lg : small ? fontSize.xs : fontSize.sm,
          color,
          fontWeight: bold ? "800" : "600",
        }}
      >
        {value}
      </Text>
    </View>
  );
}
