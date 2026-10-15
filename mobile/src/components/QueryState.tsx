import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { radius, spacing, type, useTheme } from "../theme";
import { describeError } from "../api/client";
import { Button } from "./Button";
import { Icon } from "./Icon";

/** Pasa a `true` si `active` sigue encendido después de `ms`. */
export function useSlowFlag(active: boolean, ms = 6000): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setSlow(true), ms);
    return () => {
      clearTimeout(id);
      setSlow(false);
    };
  }, [active, ms]);
  return active && slow;
}

/** Aviso honesto para esperas largas (el servidor gratuito tarda en despertar). */
function SlowHint() {
  const t = useTheme();
  return (
    <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400", textAlign: "center", maxWidth: 300 }]}>
      Estamos despertando el servidor. La primera carga puede tardar hasta un minuto.
    </Text>
  );
}

/** Carga a pantalla completa o dentro de una lista. */
export function LoadingState({ label }: { label: string }) {
  const t = useTheme();
  const slow = useSlowFlag(true);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{ padding: spacing[8], alignItems: "center", gap: spacing[3] }}
    >
      <ActivityIndicator color={t.primary} />
      <Text style={[type.footnote, { color: t.textSecondary }]}>{label}</Text>
      {slow ? <SlowHint /> : null}
    </View>
  );
}

/** Error con causa y salida: nunca se confunde con "no hay datos". */
export function ErrorState({ error, onRetry, retrying }: { error: unknown; onRetry?: () => void; retrying?: boolean }) {
  const t = useTheme();
  const info = describeError(error);
  return (
    <View
      accessibilityRole="alert"
      style={{ paddingHorizontal: spacing[8], paddingVertical: spacing[8], alignItems: "center", gap: spacing[3] }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radius.full,
          backgroundColor: t.dangerLight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={info.kind === "offline" ? "cloud-offline-outline" : "alert-circle-outline"} size={30} color={t.danger} />
      </View>
      <Text style={[type.headline, { color: t.textPrimary, textAlign: "center" }]}>{info.title}</Text>
      <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400", textAlign: "center", maxWidth: 300 }]}>
        {info.message}
      </Text>
      {onRetry ? (
        <Button
          title="Reintentar"
          variant="outline"
          loading={retrying}
          icon={<Icon name="refresh" size={18} color={t.primary} />}
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
}

/** Esqueleto de la cuadrícula de productos: ocupa el lugar mientras cargan. */
export function ProductGridSkeleton({ count = 4, gutter = spacing[5] }: { count?: number; gutter?: number }) {
  const t = useTheme();
  const slow = useSlowFlag(true);
  const rows = Math.ceil(count / 2);
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Cargando cosechas" style={{ gap: spacing[6], paddingHorizontal: gutter }}>
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={{ flexDirection: "row", gap: spacing[4] }}>
          {[0, 1].map((c) => (
            <View key={c} style={{ flex: 1, gap: spacing[2] }}>
              <View style={{ aspectRatio: 1, borderRadius: radius.lg, backgroundColor: t.bgSecondary }} />
              <View style={{ height: 14, width: "70%", borderRadius: 4, backgroundColor: t.bgSecondary }} />
              <View style={{ height: 12, width: "50%", borderRadius: 4, backgroundColor: t.bgSecondary }} />
            </View>
          ))}
        </View>
      ))}
      {slow ? (
        <View style={{ alignItems: "center" }}>
          <SlowHint />
        </View>
      ) : null}
    </View>
  );
}
