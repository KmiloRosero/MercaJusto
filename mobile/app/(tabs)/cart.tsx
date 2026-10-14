import React, { useEffect } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar } from "../../src/components/TopBar";
import { Button } from "../../src/components/Button";
import { Pill } from "../../src/components/Pill";
import { Icon } from "../../src/components/Icon";
import { FieldTile } from "../../src/components/FieldTile";
import { fontSize, radius, spacing, useTheme, formatCOP } from "../../src/theme";
import { useCart } from "../../src/store/cart";
import { cartSavings } from "../../src/lib/savings";
import { effectivePrice, orderTotals } from "../../src/lib/pricing";

export default function Cart() {
  const router = useRouter();
  const t = useTheme();
  const { items, subtotal, fetch, updateQty, error } = useCart();

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
      {error ? (
        <Pressable
          onPress={() => useCart.setState({ error: null })}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[2],
            backgroundColor: `${t.danger}1A`,
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

      {items.length === 0 ? (
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
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing[3],
                      paddingVertical: spacing[2],
                      borderTopWidth: 1,
                      borderTopColor: t.border,
                    }}
                  >
                    <FieldTile category={it.product.category} size={52} iconSize={26} radius={radius.md} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: t.textPrimary }}>
                        {it.product.name}
                      </Text>
                      <Text style={{ fontSize: fontSize.xs, color: t.textTertiary, marginTop: 2 }}>
                        {formatCOP(effectivePrice(it.product))} / {it.product.unit}
                        {effectivePrice(it.product) < it.product.price ? (
                          <Text style={{ textDecorationLine: "line-through" }}>
                            {"  "}{formatCOP(it.product.price)}
                          </Text>
                        ) : null}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: t.bgSecondary,
                        borderRadius: radius.full,
                        paddingHorizontal: 6,
                        paddingVertical: 4,
                        gap: 6,
                        borderWidth: 1,
                        borderColor: t.border,
                      }}
                    >
                      <Pressable
                        onPress={() => updateQty(it.id, it.quantity - 1)}
                        style={({ pressed }) => ({
                          width: 26,
                          height: 26,
                          borderRadius: radius.full,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: pressed ? t.gray200 : "transparent",
                        })}
                      >
                        <Icon name={it.quantity === 1 ? "trash-outline" : "remove"} size={14} color={t.textPrimary} />
                      </Pressable>

                      <Text style={{ fontSize: 14, fontWeight: "800", color: t.textPrimary, minWidth: 18, textAlign: "center" }}>
                        {it.quantity}
                      </Text>

                      <Pressable
                        onPress={() => updateQty(it.id, it.quantity + 1)}
                        disabled={it.quantity >= it.product.stock}
                        style={({ pressed }) => ({
                          width: 26,
                          height: 26,
                          borderRadius: radius.full,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: pressed ? t.gray200 : "transparent",
                        })}
                      >
                        <Icon name="add" size={14} color={t.textPrimary} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          />

          <View
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
            <Row label="Comisión plataforma (5%)" value={formatCOP(platformFee)} color={t.textSecondary} small />
            <Row label="Ahorro vs. plaza" value={`− ${formatCOP(savings)}`} color={t.success} small />
            <View style={{ height: 1, backgroundColor: t.border, marginVertical: spacing[2] }} />
            <Row label="Total a pagar" value={formatCOP(total)} color={t.primary} bold />
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
