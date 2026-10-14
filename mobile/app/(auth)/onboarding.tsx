import React, { useRef, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated";
import { Button } from "../../src/components/Button";
import { Icon, IconName } from "../../src/components/Icon";
import { LogoMark } from "../../src/components/Logo";
import { formatCOP, radius, spacing, type, useTheme, ThemeColors } from "../../src/theme";

type Role = "BUYER" | "PRODUCER";

const SLIDES = [
  {
    key: "origen",
    overline: "Directo del campo",
    title: "Compra a quien\ncultiva tu comida",
    body: "Productores campesinos de Nariño publican su cosecha del día. Tú eliges, sin intermediarios.",
  },
  {
    key: "entrega",
    overline: "Entrega agrupada",
    title: "Pide y sigue tu\npedido en vivo",
    body: "Agrupamos los pedidos por zona para que el envío sea rápido y económico. Ves cada paso hasta tu puerta.",
  },
  {
    key: "precio",
    overline: "Precio justo",
    title: "Pagas menos.\nEl campo gana más.",
    body: "El productor recibe el precio que fija y tú ahorras frente a la plaza de mercado.",
  },
] as const;

export default function Onboarding() {
  const router = useRouter();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const listRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const [role, setRole] = useState<Role | null>(null);
  const [pagerHeight, setPagerHeight] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  // El paso actual se deriva del desplazamiento: funciona con swipe, con
  // "Siguiente"/"Omitir" y en todas las plataformas.
  useAnimatedReaction(
    () => (width > 0 ? Math.round(scrollX.value / width) : 0),
    (page, prev) => {
      if (page !== prev) runOnJS(setIndex)(page);
    },
    [width]
  );

  const goTo = (i: number) => {
    listRef.current?.scrollTo({ x: i * width, animated: true });
  };

  const toLogin = (r?: Role | null) =>
    router.push({ pathname: "/(auth)/login", params: { role: r ?? "BUYER" } });

  const onPrimary = () => {
    if (!isLast) return goTo(index + 1);
    if (role) toLogin(role);
  };

  const primaryLabel = !isLast
    ? "Siguiente"
    : role === "PRODUCER"
    ? "Continuar como productor"
    : role === "BUYER"
    ? "Continuar como comprador"
    : "Elige cómo usarás MercaJusto";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }}>
      {/* Encabezado: marca + omitir */}
      <View
        style={{
          height: 52,
          paddingHorizontal: spacing[6],
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              backgroundColor: t.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogoMark size={22} knockout={t.primary} />
          </View>
          <Text style={[type.callout, { color: t.textPrimary, fontWeight: "700" }]}>MercaJusto</Text>
        </View>
        {!isLast ? (
          <Pressable
            onPress={() => goTo(SLIDES.length - 1)}
            hitSlop={12}
            accessibilityRole="button"
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingVertical: spacing[2] })}
          >
            <Text style={[type.callout, { color: t.textSecondary }]}>Omitir</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Progreso segmentado: cada barra se llena con el desplazamiento */}
      <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: spacing[6], marginTop: spacing[2] }}>
        {SLIDES.map((s, i) => (
          <ProgressSegment key={s.key} i={i} scrollX={scrollX} width={width} t={t} />
        ))}
      </View>

      <Animated.ScrollView
        ref={listRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <Slide
            key={slide.key}
            i={i}
            width={width}
            height={pagerHeight}
            scrollX={scrollX}
            parallax={!reduceMotion}
            overline={`0${i + 1}  ·  ${slide.overline}`}
            title={slide.title}
            body={slide.body}
            t={t}
          >
            {i === 0 ? <ProducerScene t={t} /> : null}
            {i === 1 ? <TrackingScene t={t} /> : null}
            {i === 2 ? <PriceScene t={t} i={i} scrollX={scrollX} width={width} /> : null}
          </Slide>
        ))}
      </Animated.ScrollView>

      {/* Pie: elección de rol en el último paso + acciones */}
      <View style={{ paddingHorizontal: spacing[6], paddingBottom: spacing[4], gap: spacing[3] }}>
        {isLast ? (
          <View style={{ flexDirection: "row", gap: spacing[3] }} accessibilityRole="radiogroup">
            <RoleOption
              icon="bag-handle-outline"
              title="Quiero comprar"
              active={role === "BUYER"}
              onPress={() => setRole("BUYER")}
              t={t}
            />
            <RoleOption
              icon="mci:sprout"
              title="Quiero vender"
              active={role === "PRODUCER"}
              onPress={() => setRole("PRODUCER")}
              t={t}
            />
          </View>
        ) : null}

        <Button
          title={primaryLabel}
          onPress={onPrimary}
          disabled={isLast && !role}
          full
          size="lg"
          trailingIcon={!isLast || role ? <Icon name="arrow-forward" size={18} color="#FFFFFF" /> : undefined}
        />
        <Pressable
          onPress={() => toLogin(role)}
          hitSlop={8}
          accessibilityRole="button"
          style={({ pressed }) => ({ alignItems: "center", paddingVertical: spacing[2], opacity: pressed ? 0.5 : 1 })}
        >
          <Text style={[type.footnote, { color: t.textSecondary }]}>
            ¿Ya tienes cuenta? <Text style={{ color: t.primary, fontWeight: "700" }}>Inicia sesión</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════
// Estructura de cada paso
// ═══════════════════════════════════════════

function Slide({
  i,
  width,
  height,
  scrollX,
  parallax,
  overline,
  title,
  body,
  t,
  children,
}: {
  i: number;
  width: number;
  height: number;
  scrollX: SharedValue<number>;
  parallax: boolean;
  overline: string;
  title: string;
  body: string;
  t: ThemeColors;
  children: React.ReactNode;
}) {
  const range = [(i - 1) * width, i * width, (i + 1) * width];

  // La escena se desplaza más lento que la página (profundidad); el texto se
  // desvanece en los bordes para que el cambio de paso se lea limpio.
  const sceneStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, range, [0.3, 1, 0.3], Extrapolation.CLAMP),
    transform: [
      {
        translateX: parallax
          ? interpolate(scrollX.value, range, [width * 0.35, 0, -width * 0.35], Extrapolation.CLAMP)
          : 0,
      },
    ],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, range, [0, 1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateX: parallax
          ? interpolate(scrollX.value, range, [width * 0.12, 0, -width * 0.12], Extrapolation.CLAMP)
          : 0,
      },
    ],
  }));

  return (
    <View style={{ width, height: height || undefined, paddingHorizontal: spacing[6], paddingTop: spacing[4] }}>
      <Animated.View style={[{ flex: 1, justifyContent: "center" }, sceneStyle]}>{children}</Animated.View>
      <Animated.View style={[{ gap: spacing[3], paddingTop: spacing[6], paddingBottom: spacing[5] }, textStyle]}>
        <Text style={[type.overline, { color: t.primary, textTransform: "uppercase" }]}>{overline}</Text>
        <Text style={[type.display, { color: t.textPrimary }]} accessibilityRole="header">
          {title}
        </Text>
        <Text style={[type.body, { color: t.textSecondary, maxWidth: 360 }]}>{body}</Text>
      </Animated.View>
    </View>
  );
}

function ProgressSegment({
  i,
  scrollX,
  width,
  t,
}: {
  i: number;
  scrollX: SharedValue<number>;
  width: number;
  t: ThemeColors;
}) {
  // Relleno con scaleX desde el borde izquierdo: solo transform, sin re-layout.
  const fillStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scaleX: interpolate(scrollX.value, [(i - 1) * width, i * width], [0, 1], Extrapolation.CLAMP),
      },
    ],
  }));
  return (
    <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: t.gray200, overflow: "hidden" }}>
      <Animated.View
        style={[
          { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: t.primary, transformOrigin: "left" },
          fillStyle,
        ]}
      />
    </View>
  );
}

function RoleOption({
  icon,
  title,
  active,
  onPress,
  t,
}: {
  icon: IconName | string;
  title: string;
  active: boolean;
  onPress: () => void;
  t: ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      style={({ pressed }) => ({
        flex: 1,
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing[2],
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: active ? t.primary : t.border,
        backgroundColor: active ? t.primaryLight : t.bgPrimary,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon name={icon} size={20} color={active ? t.primary : t.textSecondary} />
      <Text style={[type.callout, { color: active ? t.primary : t.textPrimary }]}>{title}</Text>
    </Pressable>
  );
}

// ═══════════════════════════════════════════
// Escenas: fragmentos reales de la app como ilustración
// ═══════════════════════════════════════════

function SceneFrame({ t, children }: { t: ThemeColors; children: React.ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 28,
        backgroundColor: t.bgSecondary,
        padding: spacing[5],
        gap: spacing[3],
        justifyContent: "center",
        flex: 1,
        minHeight: 260,
        maxHeight: 420,
      }}
    >
      {children}
    </View>
  );
}

function Card({ t, children, inset = 0 }: { t: ThemeColors; children: React.ReactNode; inset?: number }) {
  return (
    <View
      style={{
        backgroundColor: t.bgCard,
        borderRadius: 18,
        padding: spacing[4],
        marginHorizontal: inset,
        borderWidth: 1,
        borderColor: t.border,
        shadowColor: "#0B1B2B",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 3,
      }}
    >
      {children}
    </View>
  );
}

function ProducerScene({ t }: { t: ThemeColors }) {
  return (
    <SceneFrame t={t}>
      <Card t={t}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: t.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>JT</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.callout, { color: t.textPrimary }]}>José Tulio Enríquez</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Icon name="location-outline" size={12} color={t.textTertiary} />
              <Text style={[type.footnote, { color: t.textSecondary }]}>Túquerres</Text>
              <Text style={[type.footnote, { color: t.textTertiary }]}> · </Text>
              <Icon name="star" size={12} color={t.warning} />
              <Text style={[type.footnote, { color: t.textSecondary }]}>4.8</Text>
            </View>
          </View>
        </View>
      </Card>

      <Card t={t} inset={spacing[5]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: t.primaryLight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="Tubérculos" size={22} color={t.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.callout, { color: t.textPrimary }]}>Papa criolla</Text>
            <Text style={[type.footnote, { color: t.success }]}>Cosechada hoy</Text>
          </View>
          <Text style={[type.callout, { color: t.textPrimary, fontWeight: "700" }]}>
            {formatCOP(8500)}
            <Text style={[type.footnote, { color: t.textTertiary, fontWeight: "500" }]}>/kg</Text>
          </Text>
        </View>
      </Card>
    </SceneFrame>
  );
}

function TrackingScene({ t }: { t: ThemeColors }) {
  const steps: Array<{ label: string; state: "done" | "active" | "todo" }> = [
    { label: "Pedido confirmado", state: "done" },
    { label: "Preparando", state: "done" },
    { label: "En camino", state: "active" },
    { label: "Entregado", state: "todo" },
  ];
  return (
    <SceneFrame t={t}>
      <Card t={t}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing[4] }}>
          <Text style={[type.footnote, { color: t.textTertiary }]}>Pedido #A3F9C210</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: radius.full,
              backgroundColor: t.accentLight,
            }}
          >
            <Icon name="in_transit" size={12} color={t.accent} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: t.accent }}>En camino</Text>
          </View>
        </View>

        <View style={{ gap: spacing[3] }}>
          {steps.map((s, i) => (
            <View key={s.label} style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
              <View style={{ alignItems: "center", width: 20 }}>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: s.state === "done" ? t.success : s.state === "active" ? t.primary : t.bgSecondary,
                    borderWidth: s.state === "todo" ? 1.5 : 0,
                    borderColor: t.border,
                  }}
                >
                  {s.state !== "todo" ? (
                    <Icon name={s.state === "done" ? "checkmark" : "ellipse"} size={s.state === "done" ? 12 : 8} color="#FFFFFF" />
                  ) : null}
                </View>
                {i < steps.length - 1 ? (
                  <View
                    style={{
                      position: "absolute",
                      top: 22,
                      width: 2,
                      height: spacing[3] - 4,
                      backgroundColor: s.state === "done" ? t.success : t.border,
                    }}
                  />
                ) : null}
              </View>
              <Text
                style={[
                  type.footnote,
                  {
                    color: s.state === "todo" ? t.textTertiary : t.textPrimary,
                    fontWeight: s.state === "active" ? "700" : "500",
                  },
                ]}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card t={t} inset={spacing[5]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: t.primaryLight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="in_transit" size={18} color={t.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.callout, { color: t.textPrimary }]}>Wilson López</Text>
            <Text style={[type.footnote, { color: t.textSecondary }]}>Ruta agrupada · Zona Pasto</Text>
          </View>
        </View>
      </Card>
    </SceneFrame>
  );
}

function PriceScene({
  t,
  i,
  scrollX,
  width,
}: {
  t: ThemeColors;
  i: number;
  scrollX: SharedValue<number>;
  width: number;
}) {
  // Precios reales del catálogo demo (papa pastusa, kilo).
  const plaza = 5500;
  const justo = 3800;
  const savingPct = Math.round(((plaza - justo) / plaza) * 100);

  return (
    <SceneFrame t={t}>
      <Card t={t}>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: spacing[4] }}>
          <Text style={[type.callout, { color: t.textPrimary }]}>Papa pastusa · 1 kg</Text>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: radius.full,
              backgroundColor: "rgba(45,198,83,0.14)",
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: t.success }}>Ahorras {savingPct}%</Text>
          </View>
        </View>
        <View style={{ gap: spacing[4] }}>
          <PriceBar label="Plaza de mercado" value={plaza} ratio={1} color={t.gray300} {...{ t, i, scrollX, width }} />
          <PriceBar label="MercaJusto" value={justo} ratio={justo / plaza} color={t.primary} {...{ t, i, scrollX, width }} />
        </View>
      </Card>

      <Card t={t} inset={spacing[5]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
          <Icon name="shield-checkmark" size={20} color={t.success} />
          <Text style={[type.footnote, { flex: 1, color: t.textPrimary }]}>
            El productor recibe el precio que él mismo fija.
          </Text>
        </View>
      </Card>
    </SceneFrame>
  );
}

function PriceBar({
  label,
  value,
  ratio,
  color,
  t,
  i,
  scrollX,
  width,
}: {
  label: string;
  value: number;
  ratio: number;
  color: string;
  t: ThemeColors;
  i: number;
  scrollX: SharedValue<number>;
  width: number;
}) {
  // La barra crece (scaleX desde la izquierda) a medida que el paso entra.
  const fillStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scaleX: ratio * interpolate(scrollX.value, [(i - 0.6) * width, i * width], [0.15, 1], Extrapolation.CLAMP),
      },
    ],
  }));
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={[type.footnote, { color: t.textSecondary }]}>{label}</Text>
        <Text style={[type.footnote, { color: t.textPrimary, fontWeight: "700" }]}>{formatCOP(value)}</Text>
      </View>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: t.bgSecondary, overflow: "hidden" }}>
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              borderRadius: 5,
              backgroundColor: color,
              transformOrigin: "left",
            },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}
