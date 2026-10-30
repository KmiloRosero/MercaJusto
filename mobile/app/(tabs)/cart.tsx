import React, { useEffect } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { Avatar } from "../../src/components/Avatar";
import { InlineStepper } from "../../src/components/AddControl";
import { Icon } from "../../src/components/Icon";
import { FieldTile } from "../../src/components/FieldTile";
import { fontSize, radius, spacing, type, useTheme, formatCOP } from "../../src/theme";
import { useCart } from "../../src/store/cart";
import { cartSavings } from "../../src/lib/savings";
import { effectivePrice, orderTotals } from "../../src/lib/pricing";

import { SavingsNote } from "../../src/components/SavingsNote";
import { showAlert } from "../../src/lib/dialog";
import { ErrorState, LoadingState } from "../../src/components/QueryState";

import { useSnackbarAnchor } from "../../src/lib/useSnackbarAnchor";
import { PageShader } from "../../src/components/PageShader";
import { useDockInset } from "../../src/components/ui/Dock";

export default function Cart() {
  const router = useRouter();
  const t = useTheme();
  // El resumen va sobre las pestañas: el snackbar se ancla encima de ambos.
  const dockInset = useDockInset();
  const onSummaryLayout = useSnackbarAnchor(dockInset);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={["top"]}>
      <PageShader />
      <View style={{ paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[2] }}>
        <Text accessibilityRole="header" style={[type.title, { color: t.textPrimary }]}>
          Mi canasta
        </Text>
        {items.length > 0 ? (
          <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>
            {items.length} producto{items.length !== 1 ? "s" : ""} de {Object.keys(groupedByProducer).length}{" "}
            productor{Object.keys(groupedByProducer).length !== 1 ? "es" : ""}, un solo envío
          </Text>
        ) : null}
      </View>
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
              backgroundColor: t.bgInput,
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
            contentContainerStyle={{ paddingBottom: 300 + dockInset }}
            ItemSeparatorComponent={() => <View style={{ height: spacing[2], backgroundColor: t.bgSecondary }} />}
            renderItem={({ item: [_, producerItems] }) => {
              const producer = producerItems[0].product.producer;
              return (
                <View style={{ paddingHorizontal: spacing[5], paddingVertical: spacing[4], gap: spacing[1] }}>
                  <Pressable
                    onPress={() => producer && router.push(`/productor/${producer.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver cosechas de ${producer?.name ?? "el productor"}`}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing[3],
                      paddingBottom: spacing[2],
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Avatar name={producer?.name} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={[type.callout, { color: t.textPrimary, fontWeight: "700" }]}>
                        {producer?.name || "Productor"}
                      </Text>
                      <Text style={[type.footnote, { color: t.textTertiary, fontWeight: "400" }]}>
                        {producerItems[0].product.municipio}, Nariño
                      </Text>
                    </View>
                    <Icon name="chevron-forward" size={18} color={t.textTertiary} />
                  </Pressable>

                  {producerItems.map((it) => (
                    <View
                      key={it.id}
                      style={{ flexDirection: "row", alignItems: "center", gap: spacing[3], paddingVertical: spacing[2] }}
                    >
                      <FieldTile
                        category={it.product.category}
                        productName={it.product.name}
                        size={64}
                        iconSize={30}
                        radius={radius.md}
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text numberOfLines={2} style={[type.callout, { color: t.textPrimary, fontWeight: "500" }]}>
                          {it.product.name}
                        </Text>
                        <Text style={[type.footnote, { color: t.textTertiary, fontWeight: "400" }]}>
                          {formatCOP(effectivePrice(it.product))} / {it.product.unit}
                        </Text>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: t.textPrimary }}>
                          {formatCOP(effectivePrice(it.product) * it.quantity)}
                        </Text>
                      </View>
                      <InlineStepper
                        value={it.quantity}
                        max={it.product.stock}
                        pending={!!pendingIds[it.id]}
                        label={it.product.name}
                        onChange={(q) => updateQty(it.id, q)}
                        onRemove={() => remove(it)}
                      />
                    </View>
                  ))}
                </View>
              );
            }}
          />

          <View
            onLayout={onSummaryLayout}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: t.bgCard,
              paddingHorizontal: spacing[5],
              paddingTop: spacing[4],
              // Llega hasta abajo: el dock flota sobre el final del resumen.
              paddingBottom: spacing[4] + dockInset,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              gap: spacing[2],
              shadowColor: "#0A140E",
              shadowOffset: { width: 0, height: -6 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 12,
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
            <Button title={`Ir a pagar  ${formatCOP(total)}`} onPress={() => router.push("/checkout")} full size="lg" />
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
