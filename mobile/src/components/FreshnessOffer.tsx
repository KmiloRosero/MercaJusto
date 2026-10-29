import React from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { fontSize, formatCOP, radius, spacing, type, useTheme } from "../theme";
import { SPOIL_DAYS, SPOIL_DISCOUNTS, spoilDayLabel, suggestedDiscount, untilLabel } from "../lib/freshness";
import { Icon } from "./Icon";

const SURPLUS_DISCOUNTS = [10, 20, 30];

interface Props {
  /** En cuántos días se daña; null = aguanta bien. */
  spoilsIn: number | null;
  onSpoilsIn: (days: number | null) => void;
  isSurplus: boolean;
  onSurplus: (v: boolean) => void;
  discountPct: number;
  onDiscount: (pct: number) => void;
  /** Precio normal, para mostrar cuánto paga el comprador con la oferta. */
  price: number;
  unit: string;
}

/**
 * "¿Se va a dañar pronto?" para publicar y editar una cosecha. Si se daña
 * pronto, el productor dice cuándo y puede ponerle una oferta (la app sugiere
 * una según la urgencia); así sale en el cuadro "Rescátalo hoy" del inicio con
 * su cuenta regresiva. Si aguanta, queda el modo excedente de siempre.
 */
export function FreshnessOffer({ spoilsIn, onSpoilsIn, isSurplus, onSurplus, discountPct, onDiscount, price, unit }: Props) {
  const t = useTheme();
  const spoils = spoilsIn !== null;
  const hasOffer = spoils ? discountPct > 0 : isSurplus;
  const finalPrice = hasOffer ? Math.round(price * (1 - discountPct / 100)) : price;

  const pickDays = (d: number) => {
    onSpoilsIn(d);
    onDiscount(suggestedDiscount(d));
    onSurplus(true);
  };
  const pickDiscount = (d: number) => {
    onDiscount(d);
    if (spoils) onSurplus(d > 0);
  };

  return (
    <View style={{ gap: spacing[4] }}>
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="time" size={18} color={t.accent} />
          <Text style={{ fontSize: fontSize.base, fontWeight: "800", color: t.textPrimary }}>¿Se va a dañar pronto?</Text>
        </View>
        <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>
          Si se daña pronto, sale de primero en el inicio de los compradores con una cuenta regresiva.
        </Text>
      </View>

      <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: spacing[2] }}>
        <Choice
          selected={!spoils}
          icon="checkmark-circle"
          title="No, aguanta"
          onPress={() => {
            onSpoilsIn(null);
            onSurplus(false);
            onDiscount(20);
          }}
        />
        <Choice selected={spoils} icon="alert-circle" title="Sí, pronto" tone="accent" onPress={() => pickDays(spoilsIn ?? 1)} />
      </View>

      {spoils ? (
        <>
          <Group label="¿Cuándo se daña?">
            <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
              {SPOIL_DAYS.map((d) => (
                <Chip key={d} label={spoilDayLabel(d)} selected={d === spoilsIn} onPress={() => pickDays(d)} />
              ))}
            </View>
          </Group>

          <Group label="Ponle una oferta para que alcance a venderse">
            <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
              {SPOIL_DISCOUNTS.map((d) => (
                <Chip
                  key={d}
                  label={d === 0 ? "Sin oferta" : `-${d} %`}
                  selected={d === discountPct}
                  hint={d === suggestedDiscount(spoilsIn ?? 1) ? "Sugerido" : undefined}
                  onPress={() => pickDiscount(d)}
                  wide
                />
              ))}
            </View>
          </Group>

          <View style={{ flexDirection: "row", gap: spacing[2], padding: spacing[3], borderRadius: radius.md, backgroundColor: t.accentLight }}>
            <Icon name="flash" size={16} color={t.onAccentLight} />
            <Text style={[type.footnote, { flex: 1, color: t.onAccentLight, fontWeight: "500" }]}>
              Saldrá en el cuadro «Rescátalo hoy» hasta {untilLabel(spoilsIn)} a la medianoche.
              {discountPct > 0 ? " Avisamos a los compradores cercanos de la oferta." : ""}
            </Text>
          </View>
        </>
      ) : (
        <View style={{ gap: spacing[3] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
            <View style={{ flex: 1 }}>
              <Text style={[type.callout, { color: t.textPrimary }]}>¿Te sobró cosecha?</Text>
              <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>Ponle un descuento de excedente.</Text>
            </View>
            <Switch
              value={isSurplus}
              onValueChange={onSurplus}
              trackColor={{ true: t.accent, false: t.gray300 }}
              thumbColor={isSurplus ? t.onAccent : t.bgCard}
              accessibilityLabel="Modo excedente"
            />
          </View>
          {isSurplus ? (
            <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: spacing[2] }}>
              {SURPLUS_DISCOUNTS.map((d) => (
                <Chip key={d} label={`-${d} %`} selected={d === discountPct} onPress={() => onDiscount(d)} wide />
              ))}
            </View>
          ) : null}
        </View>
      )}

      {price > 0 ? (
        <Text style={[type.callout, { color: t.textPrimary }]}>
          El comprador paga {formatCOP(finalPrice)} por {unit}
          {hasOffer ? <Text style={{ color: t.textTertiary, fontWeight: "400" }}> · antes {formatCOP(price)}</Text> : null}
        </Text>
      ) : null}
    </View>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: spacing[2] }}>
      <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: t.textSecondary }}>{label}</Text>
      {children}
    </View>
  );
}

function Choice({
  selected,
  icon,
  title,
  tone = "primary",
  onPress,
}: {
  selected: boolean;
  icon: string;
  title: string;
  tone?: "primary" | "accent";
  onPress: () => void;
}) {
  const t = useTheme();
  const on = tone === "accent" ? { border: t.accent, bg: t.accentLight, ink: t.onAccentLight } : { border: t.primary, bg: t.primaryLight, ink: t.onPrimaryLight };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={{
        flex: 1,
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingHorizontal: spacing[3],
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: selected ? on.border : t.border,
        backgroundColor: selected ? on.bg : t.bgPrimary,
      }}
    >
      <Icon name={icon} size={18} color={selected ? on.ink : t.textTertiary} />
      <Text style={{ fontSize: fontSize.base, fontWeight: "800", color: selected ? on.ink : t.textSecondary }}>{title}</Text>
    </Pressable>
  );
}

function Chip({
  label,
  selected,
  hint,
  wide,
  onPress,
}: {
  label: string;
  selected: boolean;
  hint?: string;
  wide?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={hint ? `${label}, ${hint.toLowerCase()}` : label}
      style={{
        minHeight: 48,
        flexGrow: wide ? 1 : 0,
        flexBasis: wide ? "30%" : undefined,
        paddingHorizontal: spacing[4],
        justifyContent: "center",
        alignItems: "center",
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: selected ? t.accent : t.border,
        backgroundColor: selected ? t.accentLight : t.bgPrimary,
      }}
    >
      <Text style={{ fontSize: fontSize.base, fontWeight: "800", color: selected ? t.onAccentLight : t.textSecondary }}>{label}</Text>
      {hint ? <Text style={{ fontSize: 11, lineHeight: 13, fontWeight: "700", color: selected ? t.onAccentLight : t.accent }}>{hint}</Text> : null}
    </Pressable>
  );
}
