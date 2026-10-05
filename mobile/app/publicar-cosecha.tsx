import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { TopBar } from "../src/components/TopBar";
import { Button } from "../src/components/Button";
import { fontSize, radius, spacing, useTheme } from "../src/theme";
import { apiErrorMessage, createProduct, getCategories } from "../src/api/client";

const UNITS = ["Kilo", "Libra", "Atado", "Docena", "Unidad", "Litro"];
const DISCOUNTS = [10, 20, 30];

export default function PublicarCosecha() {
  const router = useRouter();
  const t = useTheme();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("Kilo");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [isSurplus, setIsSurplus] = useState(false);
  const [discountPct, setDiscountPct] = useState(20);
  const [municipio, setMunicipio] = useState("Pasto");
  const [vereda, setVereda] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso denegado", "Necesitamos tu ubicación para mostrar la cosecha a compradores cercanos.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      try {
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geo?.city) setMunicipio(geo.city);
      } catch {
        // sin red no es crítico
      }
    } catch (err) {
      Alert.alert("Error", apiErrorMessage(err));
    } finally {
      setLocating(false);
    }
  };

  const submit = async () => {
    const priceNum = parseInt(price.replace(/\D/g, ""), 10);
    const stockNum = parseInt(stock.replace(/\D/g, ""), 10);

    if (!name.trim() || name.trim().length < 2) {
      Alert.alert("Faltan datos", "Escribe el nombre del producto.");
      return;
    }
    if (!categoryId) {
      Alert.alert("Faltan datos", "Selecciona una categoría.");
      return;
    }
    if (!priceNum || priceNum <= 0) {
      Alert.alert("Faltan datos", "Escribe un precio válido.");
      return;
    }
    if (Number.isNaN(stockNum) || stockNum < 0) {
      Alert.alert("Faltan datos", "Escribe la cantidad disponible.");
      return;
    }
    if (!municipio.trim()) {
      Alert.alert("Faltan datos", "El municipio es obligatorio.");
      return;
    }
    if (!coords) {
      Alert.alert("Ubicación requerida", "Usa el botón 'Usar mi ubicación de la finca' para georreferenciar la cosecha.");
      return;
    }

    setSaving(true);
    try {
      await createProduct({
        categoryId,
        name: name.trim(),
        description: description.trim() || undefined,
        price: priceNum,
        unit,
        stock: stockNum,
        isSurplus,
        discountPct: isSurplus ? discountPct : 0,
        vereda: vereda.trim() || undefined,
        municipio: municipio.trim(),
        latitude: coords.lat,
        longitude: coords.lng,
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      Alert.alert("¡Cosecha publicada! 🎉", "Tu producto ya está visible en el catálogo.", [
        { text: "Listo", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert("Error al publicar", apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
      <TopBar title="Publicar cosecha" showBack onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: spacing[10] }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Producto */}
          <Card>
            <Title>🌾 Producto</Title>

            <Field label="Nombre">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ej. Papa criolla"
                placeholderTextColor={t.textTertiary}
                style={inputStyle(t)}
              />
            </Field>

            <Field label="Categoría">
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
                {categories.map((c) => {
                  const selected = c.id === categoryId;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setCategoryId(c.id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingHorizontal: spacing[3],
                        paddingVertical: 8,
                        borderRadius: radius.full,
                        borderWidth: 1.5,
                        borderColor: selected ? t.primary : t.border,
                        backgroundColor: selected ? t.primaryLight : t.bgPrimary,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{c.icon}</Text>
                      <Text
                        style={{
                          fontSize: fontSize.sm,
                          fontWeight: "600",
                          color: selected ? t.primary : t.textSecondary,
                        }}
                      >
                        {c.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <Field label="Descripción (opcional)">
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Cosechada esta mañana, libre de pesticidas..."
                placeholderTextColor={t.textTertiary}
                multiline
                style={[inputStyle(t), { height: 72, paddingTop: 12, textAlignVertical: "top" }]}
              />
            </Field>
          </Card>

          {/* Precio y stock */}
          <Card>
            <Title>💰 Precio y disponibilidad</Title>

            <View style={{ flexDirection: "row", gap: spacing[3] }}>
              <View style={{ flex: 2 }}>
                <Field label="Precio (COP)">
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    placeholder="8500"
                    keyboardType="numeric"
                    placeholderTextColor={t.textTertiary}
                    style={inputStyle(t)}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Cantidad">
                  <TextInput
                    value={stock}
                    onChangeText={setStock}
                    placeholder="50"
                    keyboardType="numeric"
                    placeholderTextColor={t.textTertiary}
                    style={inputStyle(t)}
                  />
                </Field>
              </View>
            </View>

            <Field label="Unidad de venta">
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
                {UNITS.map((u) => {
                  const selected = u === unit;
                  return (
                    <Pressable
                      key={u}
                      onPress={() => setUnit(u)}
                      style={{
                        paddingHorizontal: spacing[3],
                        paddingVertical: 8,
                        borderRadius: radius.full,
                        borderWidth: 1.5,
                        borderColor: selected ? t.accent : t.border,
                        backgroundColor: selected ? t.accentLight : t.bgPrimary,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: fontSize.sm,
                          fontWeight: "600",
                          color: selected ? t.accent : t.textSecondary,
                        }}
                      >
                        {u}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>
          </Card>

          {/* Excedente */}
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fontSize.base, fontWeight: "700", color: t.textPrimary }}>
                  ♻️ Modo excedente
                </Text>
                <Text style={{ fontSize: fontSize.xs, color: t.textSecondary, marginTop: 2 }}>
                  Vende más rápido con descuento y evita que se pierda.
                </Text>
              </View>
              <Switch
                value={isSurplus}
                onValueChange={setIsSurplus}
                trackColor={{ true: t.success, false: t.gray200 }}
                thumbColor="#FFFFFF"
              />
            </View>

            {isSurplus ? (
              <View style={{ marginTop: spacing[3], gap: spacing[2] }}>
                <Text style={{ fontSize: fontSize.sm, fontWeight: "500", color: t.textSecondary }}>
                  Descuento
                </Text>
                <View style={{ flexDirection: "row", gap: spacing[2] }}>
                  {DISCOUNTS.map((d) => {
                    const selected = d === discountPct;
                    return (
                      <Pressable
                        key={d}
                        onPress={() => setDiscountPct(d)}
                        style={{
                          flex: 1,
                          paddingVertical: spacing[3],
                          borderRadius: radius.md,
                          borderWidth: 1.5,
                          alignItems: "center",
                          borderColor: selected ? t.success : t.border,
                          backgroundColor: selected ? "rgba(45,198,83,0.1)" : t.bgPrimary,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: fontSize.base,
                            fontWeight: "700",
                            color: selected ? t.success : t.textSecondary,
                          }}
                        >
                          {d}%
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </Card>

          {/* Ubicación */}
          <Card>
            <Title>📍 Ubicación de la finca</Title>

            <Field label="Municipio">
              <TextInput
                value={municipio}
                onChangeText={setMunicipio}
                placeholder="Pasto"
                placeholderTextColor={t.textTertiary}
                style={inputStyle(t)}
              />
            </Field>

            <Field label="Vereda (opcional)">
              <TextInput
                value={vereda}
                onChangeText={setVereda}
                placeholder="Ej. Vereda El Diviso"
                placeholderTextColor={t.textTertiary}
                style={inputStyle(t)}
              />
            </Field>

            <Pressable
              onPress={locating ? undefined : useMyLocation}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[2],
                padding: spacing[3],
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: coords ? t.success : t.primary,
                backgroundColor: coords ? "rgba(45,198,83,0.08)" : t.primaryLight,
              }}
            >
              {locating ? (
                <ActivityIndicator size="small" color={t.primary} />
              ) : (
                <Text style={{ fontSize: 20 }}>{coords ? "✅" : "📡"}</Text>
              )}
              <Text
                style={{
                  flex: 1,
                  fontSize: fontSize.sm,
                  fontWeight: "600",
                  color: coords ? t.success : t.primary,
                }}
              >
                {locating
                  ? "Obteniendo ubicación..."
                  : coords
                  ? `Ubicación guardada (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
                  : "Usar mi ubicación de la finca"}
              </Text>
            </Pressable>
          </Card>

          <Button title="Publicar cosecha" variant="accent" size="lg" full loading={saving} onPress={submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.bgCard,
        borderRadius: radius.lg,
        padding: spacing[4],
        gap: spacing[3],
      }}
    >
      {children}
    </View>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <Text style={{ fontSize: fontSize.base, fontWeight: "700", color: t.textPrimary }}>
      {children}
    </Text>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: fontSize.sm, fontWeight: "500", color: t.textSecondary }}>{label}</Text>
      {children}
    </View>
  );
}

function inputStyle(t: ReturnType<typeof useTheme>) {
  return {
    height: 48,
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    backgroundColor: t.bgInput,
    borderWidth: 1.5,
    borderColor: t.border,
    fontSize: fontSize.base,
    color: t.textPrimary,
  } as const;
}
