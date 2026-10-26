import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "../src/components/TopBar";
import { Button } from "../src/components/Button";
import { Icon } from "../src/components/Icon";
import { BarList, ColumnChart, StatTile, compactCOP } from "../src/components/Charts";
import { ErrorState, LoadingState } from "../src/components/QueryState";
import { formatCOP, spacing, type, useTheme } from "../src/theme";
import { getImpactMetrics } from "../src/api/client";
import { useAuth } from "../src/store/auth";
import { productUrl, producerUrl, shareText } from "../src/lib/share";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** "8 sep": corto y estable en cualquier plataforma (toLocaleDateString varía entre web y Android). */
const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/**
 * "Mi impacto" para el comprador y "Mis ventas" para el productor. Una cifra
 * principal, cuatro cifras de apoyo, la serie de 8 semanas y el desglose.
 * Todo sale de pedidos reales; el ahorro solo cuenta productos con precio de plaza.
 */
export default function Impacto() {
  const router = useRouter();
  const t = useTheme();
  const user = useAuth((s) => s.user);
  const isProducer = user?.role === "PRODUCER";

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["orders", "impact", user?.id],
    queryFn: getImpactMetrics,
    enabled: !!user,
  });

  const title = isProducer ? "Mis ventas" : "Mi impacto";
  const totals = data?.totals;

  const onShare = async () => {
    if (!totals || !user) return;
    const message = isProducer
      ? `Compra mi cosecha directo, sin intermediarios, en MercaJusto: ${producerUrl(user.id)}`
      : `Con MercaJusto ahorré ${formatCOP(totals.savings)} comprando directo a ${totals.people} productores campesinos de Nariño. ${productUrl()}`;
    await shareText(message);
  };

  const section = { backgroundColor: t.bgPrimary, marginTop: spacing[2], padding: spacing[5], gap: spacing[4] } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
      <TopBar showBack onBack={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"))} title={title} />

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <LoadingState label="Calculando tus cifras…" />
        </View>
      ) : error || !data ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} />
        </View>
      ) : !totals || totals.ordersCount === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing[8], gap: spacing[3] }}>
          <Icon name="leaf-outline" size={36} color={t.textTertiary} />
          <Text style={[type.headline, { color: t.textPrimary, textAlign: "center" }]}>
            {isProducer ? "Aún no tienes ventas" : "Aún no tienes compras"}
          </Text>
          <Text style={[type.body, { color: t.textSecondary, textAlign: "center" }]}>
            {isProducer
              ? "Cuando vendas tu primera cosecha, aquí verás cuánto recibiste semana a semana."
              : "Con tu primera compra verás cuánto ahorras frente a la plaza y a quién le compraste."}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing[10] }}>
          {/* Cifra principal: una sola por pantalla */}
          <View style={[section, { marginTop: 0 }]}>
            <View style={{ gap: spacing[1] }}>
              <Text style={[type.callout, { color: t.textSecondary }]}>
                {isProducer ? "Recibiste por tus cosechas" : "Has ahorrado frente a la plaza"}
              </Text>
              <Text
                accessibilityRole="header"
                adjustsFontSizeToFit
                numberOfLines={1}
                style={{ color: t.textPrimary, fontSize: 48, lineHeight: 56, fontWeight: "800", letterSpacing: -1.5 }}
              >
                {formatCOP(isProducer ? totals.total : totals.savings)}
              </Text>
              <Text style={[type.body, { color: t.textSecondary }]}>
                {isProducer
                  ? `En ${totals.ordersCount} pedidos, sin intermediarios: el precio que fijas llega completo.`
                  : `Pagaste ${totals.savingsPct.toLocaleString("es-CO")} % menos en los productos con precio de plaza, y el dinero llegó directo al campo.`}
              </Text>
            </View>
            <Button
              title={isProducer ? "Compartir mi tienda por WhatsApp" : "Compartir mi impacto"}
              variant="outline"
              full
              icon={<Icon name="logo-whatsapp" size={18} color={t.primary} />}
              onPress={onShare}
            />
          </View>

          {/* Cifras de apoyo */}
          <View style={[section, { flexDirection: "row", flexWrap: "wrap", gap: spacing[3] }]}>
            {isProducer ? (
              <>
                <StatTile value={totals.unitsSold.toLocaleString("es-CO")} label="unidades vendidas" icon={<Icon name="mci:basket" size={20} color={t.primary} />} />
                <StatTile
                  value={totals.surplusUnits.toLocaleString("es-CO")}
                  label="unidades de excedente que no se perdieron"
                  icon={<Icon name="leaf" size={20} color={t.accent} />}
                />
                <StatTile value={totals.people.toLocaleString("es-CO")} label="compradores atendidos" icon={<Icon name="people-outline" size={20} color={t.primary} />} />
                <StatTile value={totals.ordersCount.toLocaleString("es-CO")} label="pedidos" icon={<Icon name="receipt-outline" size={20} color={t.primary} />} />
              </>
            ) : (
              <>
                <StatTile
                  value={`${totals.savingsPct.toLocaleString("es-CO")} %`}
                  label="menos que en la plaza"
                  icon={<Icon name="trending-down" size={20} color={t.primary} />}
                />
                <StatTile
                  value={totals.surplusUnits.toLocaleString("es-CO")}
                  label="unidades de excedente rescatadas"
                  icon={<Icon name="leaf" size={20} color={t.accent} />}
                />
                <StatTile value={totals.people.toLocaleString("es-CO")} label="productores apoyados" icon={<Icon name="mci:account-cowboy-hat" size={20} color={t.primary} />} />
                <StatTile value={totals.ordersCount.toLocaleString("es-CO")} label="pedidos" icon={<Icon name="receipt-outline" size={20} color={t.primary} />} />
              </>
            )}
          </View>

          {/* Serie semanal */}
          <View style={section}>
            <View style={{ gap: 2 }}>
              <Text accessibilityRole="header" style={[type.headline, { color: t.textPrimary }]}>
                {isProducer ? "Lo que recibiste por semana" : "Tu ahorro por semana"}
              </Text>
              <Text style={[type.footnote, { color: t.textTertiary, fontWeight: "400" }]}>Últimas 8 semanas · toca una columna para ver su valor</Text>
            </View>
            <ColumnChart
              data={data.weeks.map((w) => ({ label: shortDate(w.start), longLabel: `Semana del ${shortDate(w.start)}`, value: w.value }))}
              format={formatCOP}
            />
          </View>

          {/* Desglose */}
          {isProducer && data.topProducts.length > 0 ? (
            <View style={section}>
              <Text accessibilityRole="header" style={[type.headline, { color: t.textPrimary }]}>
                Tus cosechas más vendidas
              </Text>
              <BarList
                data={data.topProducts.map((p) => ({ label: p.name, value: p.value, detail: `${p.units} ${p.unit}` }))}
                format={compactCOP}
              />
            </View>
          ) : null}
          {!isProducer && data.byCategory.length > 0 ? (
            <View style={section}>
              <Text accessibilityRole="header" style={[type.headline, { color: t.textPrimary }]}>
                Dónde más ahorras
              </Text>
              <BarList data={data.byCategory.map((c) => ({ label: c.name, value: c.value }))} format={compactCOP} />
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
