import React, { useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { radius, spacing, type, useTheme, useThemeScheme, fields, fieldFor, formatCOP } from "../theme";
import { Category } from "../api/types";
import { Icon } from "./Icon";
import { Avatar } from "./Avatar";
import { PressableScale } from "./PressableScale";

const GUTTER = spacing[5];
const CIRCLE = 64;

/**
 * Fila de categorías en círculos, como la entrada de las apps de domicilio.
 * Cada círculo lleva el color de campo de su categoría; Excedentes va primero en arcilla.
 */
export function CategoryCircles({
  categories,
  onSurplus,
  onCategory,
}: {
  categories: Category[];
  onSurplus: () => void;
  onCategory: (slug: string) => void;
}) {
  const t = useTheme();
  const palette = fields[useThemeScheme()];

  const item = (key: string, label: string, ground: string, ink: string, icon: string, onPress: () => void) => (
    <PressableScale
      key={key}
      scaleTo={0.94}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: CIRCLE + 12, alignItems: "center", gap: spacing[2] }}
    >
      <View
        style={{
          width: CIRCLE,
          height: CIRCLE,
          borderRadius: radius.full,
          backgroundColor: ground,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={30} color={ink} />
      </View>
      <Text
        numberOfLines={2}
        style={[type.footnote, { color: t.textPrimary, fontWeight: "600", textAlign: "center" }]}
      >
        {label}
      </Text>
    </PressableScale>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: GUTTER - 6, gap: spacing[1] }}
    >
      {item("surplus", "Excedentes", t.accent, t.onAccent, "leaf", onSurplus)}
      {categories.map((c) => {
        const field = fieldFor(palette, c);
        return item(c.id, c.name, field.ground, field.ink, c.name, () => onCategory(c.slug));
      })}
    </ScrollView>
  );
}

export interface Promo {
  key: string;
  title: string;
  body: string;
  cta: string;
  icon: string;
  tone: "accent" | "primary" | "field";
  onPress: () => void;
}

/**
 * Carrusel de anuncios que se desliza de a uno, con el siguiente asomando
 * y puntos debajo. Sin fotos: color sólido y un ícono grande.
 */
export function PromoCarousel({ promos }: { promos: Promo[] }) {
  const t = useTheme();
  const dark = useThemeScheme() === "dark";
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - GUTTER * 2 - 24, 520);
  const step = cardWidth + spacing[3];
  const [index, setIndex] = useState(0);
  const granos = fields[dark ? "dark" : "light"].granos;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / step);
    if (next !== index) setIndex(Math.max(0, Math.min(promos.length - 1, next)));
  };

  const tones = {
    accent: { ground: t.accent, ink: t.onAccent },
    primary: dark ? { ground: t.primaryLight, ink: t.onPrimaryLight } : { ground: t.primary, ink: t.onPrimary },
    field: { ground: granos.ground, ink: granos.ink },
  };

  return (
    <View style={{ gap: spacing[3] }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={step}
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingHorizontal: GUTTER, gap: spacing[3] }}
      >
        {promos.map((p) => {
          const tone = tones[p.tone];
          return (
            <PressableScale
              key={p.key}
              onPress={p.onPress}
              accessibilityRole="button"
              accessibilityLabel={`${p.title}. ${p.body}. ${p.cta}`}
              style={{
                width: cardWidth,
                minHeight: 148,
                borderRadius: radius.xl,
                backgroundColor: tone.ground,
                padding: spacing[5],
                overflow: "hidden",
                justifyContent: "space-between",
                gap: spacing[3],
              }}
            >
              <View style={{ position: "absolute", right: -18, bottom: -22, opacity: 0.22 }}>
                <Icon name={p.icon} size={136} color={tone.ink} />
              </View>
              <View style={{ gap: 4, maxWidth: "72%" }}>
                <Text style={[type.title, { color: tone.ink }]}>{p.title}</Text>
                <Text style={[type.footnote, { color: tone.ink, fontWeight: "500" }]}>{p.body}</Text>
              </View>
              <View
                style={{
                  alignSelf: "flex-start",
                  height: 34,
                  paddingHorizontal: spacing[4],
                  borderRadius: radius.full,
                  backgroundColor: tone.ink,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Text style={[type.footnote, { color: tone.ground, fontWeight: "800" }]}>{p.cta}</Text>
                <Icon name="arrow-forward" size={14} color={tone.ground} />
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>
      {promos.length > 1 ? (
        <View
          style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}
          accessibilityLabel={`Anuncio ${index + 1} de ${promos.length}`}
        >
          {promos.map((p, i) => (
            <View
              key={p.key}
              style={{
                width: i === index ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === index ? t.primary : t.gray300,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export interface ProducerTile {
  id: string;
  name: string;
  rating: number;
  ratingCount?: number;
  municipio: string;
  harvests: number;
}

/** Tarjeta de productor en el riel "Productores cerca", como una tienda. */
export function ProducerCard({ producer, onPress }: { producer: ProducerTile; onPress: () => void }) {
  const t = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${producer.name}, ${producer.municipio}, ${producer.harvests} cosechas`}
      style={{
        width: 156,
        padding: spacing[3],
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.bgCard,
        gap: spacing[2],
      }}
    >
      <Avatar name={producer.name} size={48} />
      <View style={{ gap: 2 }}>
        <Text numberOfLines={2} style={[type.callout, { color: t.textPrimary, fontWeight: "700", minHeight: 40 }]}>
          {producer.name}
        </Text>
        <Text numberOfLines={1} style={[type.footnote, { color: t.textTertiary, fontWeight: "400" }]}>
          {producer.municipio}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Icon name="star" size={13} color={t.rating} />
        <Text style={[type.footnote, { color: t.textPrimary, fontWeight: "700" }]}>
          {producer.ratingCount ? producer.rating.toFixed(1) : "Nuevo"}
        </Text>
        <Text style={[type.footnote, { color: t.textTertiary, fontWeight: "400" }]}>
          · {producer.harvests} cosecha{producer.harvests !== 1 ? "s" : ""}
        </Text>
      </View>
    </PressableScale>
  );
}

/** Insignia "Envío $3.500" para cabeceras de productor y similares. */
export function DeliveryFeeLabel({ fee }: { fee: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Icon name="mci:truck-delivery" size={15} color={t.textSecondary} />
      <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "500" }]}>Envío {formatCOP(fee)}</Text>
    </View>
  );
}
