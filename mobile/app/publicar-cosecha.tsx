import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from "expo-image-picker";
import { TopBar } from "../src/components/TopBar";
import { Button } from "../src/components/Button";
import { Icon, IconName } from "../src/components/Icon";
import { fontSize, radius, spacing, useTheme } from "../src/theme";
import { apiErrorMessage, createProduct, getCategories, uploadImage } from "../src/api/client";

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
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const pickPhoto = async (useCamera: boolean) => {
    try {
      const perm = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permiso denegado",
          "Necesitamos permiso para acceder a la cámara/galería para subir la foto."
        );
        return;
      }
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
            aspect: [4, 3],
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
            aspect: [4, 3],
          });

      if (!result.canceled && result.assets[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert("Error", "No se pudo cargar la imagen.");
    }
  };

  const choosePhotoSource = () => {
    Alert.alert("Foto de cosecha", "Selecciona el origen", [
      { text: "Tomar foto con cámara", onPress: () => pickPhoto(true) },
      { text: "Elegir de galería", onPress: () => pickPhoto(false) },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso denegado", "Se necesita permiso de ubicación.");
        setLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });

      try {
        const [rev] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (rev?.city) setMunicipio(rev.city);
        if (rev?.subregion && !vereda) setVereda(rev.subregion);
      } catch {}
    } catch (err) {
      Alert.alert("Error", "No se pudo obtener la ubicación actual.");
    } finally {
      setLocating(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) return Alert.alert("Falta información", "Ingresa el nombre del producto.");
    if (!categoryId) return Alert.alert("Falta información", "Selecciona una categoría.");
    const numPrice = Number(price);
    if (!numPrice || numPrice <= 0) return Alert.alert("Precio inválido", "Ingresa un precio mayor a 0.");
    const numStock = Number(stock);
    if (!numStock || numStock <= 0) return Alert.alert("Stock inválido", "Ingresa la cantidad disponible.");
    if (!municipio.trim()) return Alert.alert("Falta información", "Ingresa el municipio de la finca.");

    setSaving(true);
    try {
      let serverPhotoUrl: string | undefined = undefined;
      if (photoUri && !photoUri.startsWith("http")) {
        serverPhotoUrl = await uploadImage(photoUri);
      } else if (photoUri) {
        serverPhotoUrl = photoUri;
      }

      const defaultCoords = coords || { lat: 1.2136, lng: -77.2811 };
      await createProduct({
        categoryId,
        name: name.trim(),
        description: description.trim() || undefined,
        price: numPrice,
        unit,
        stock: numStock,
        photoUrl: serverPhotoUrl,
        isSurplus,
        discountPct: isSurplus ? discountPct : 0,
        municipio: municipio.trim(),
        vereda: vereda.trim() || undefined,
        latitude: defaultCoords.lat,
        longitude: defaultCoords.lng,
      });

      await queryClient.invalidateQueries({ queryKey: ["products"] });
      Alert.alert("¡Publicación exitosa!", "Tu cosecha ya está disponible en MercaJusto.", [
        { text: "Ver en catálogo", onPress: () => router.replace("/(tabs)/home") },
      ]);
    } catch (err) {
      Alert.alert("Error al publicar", apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
      <TopBar showBack onBack={() => router.back()} title="Publicar cosecha" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: spacing[10] }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Foto del producto */}
          <Card>
            <Title icon="camera">Foto de la cosecha</Title>
            <Pressable
              onPress={choosePhotoSource}
              style={{
                height: 160,
                borderRadius: radius.lg,
                borderWidth: 1.5,
                borderStyle: photoUri ? "solid" : "dashed",
                borderColor: photoUri ? t.success : t.border,
                backgroundColor: t.bgInput,
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              ) : (
                <View style={{ alignItems: "center", gap: spacing[2] }}>
                  <Icon name="camera" size={36} color={t.primary} />
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "700", color: t.textSecondary }}>
                    Tomar foto o subir de galería
                  </Text>
                  <Text style={{ fontSize: fontSize.xs, color: t.textTertiary }}>
                    Una buena foto incrementa tus ventas
                  </Text>
                </View>
              )}
            </Pressable>
            {photoUri ? (
              <View style={{ flexDirection: "row", gap: spacing[2] }}>
                <Button title="Cambiar foto" variant="ghost" size="sm" style={{ flex: 1 }} onPress={choosePhotoSource} />
                <Button title="Quitar" variant="outline" size="sm" style={{ flex: 1 }} onPress={() => setPhotoUri(null)} />
              </View>
            ) : null}

            <Field label="Nombre del producto">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ej. Papa criolla limpia"
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
                      <Icon name={c.name} size={16} color={selected ? t.primary : t.textSecondary} />
                      <Text
                        style={{
                          fontSize: fontSize.sm,
                          fontWeight: "700",
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
                placeholder="Cosechada esta mañana, fresca y seleccionada..."
                placeholderTextColor={t.textTertiary}
                multiline
                style={[inputStyle(t), { height: 72, paddingTop: 12, textAlignVertical: "top" }]}
              />
            </Field>
          </Card>

          {/* Precio y stock */}
          <Card>
            <Title icon="cash-outline">Precio y disponibilidad</Title>

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
                          fontWeight: "700",
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
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Icon name="sparkles" size={18} color={t.accent} />
                  <Text style={{ fontSize: fontSize.base, fontWeight: "800", color: t.textPrimary }}>
                    Modo excedente
                  </Text>
                </View>
                <Text style={{ fontSize: fontSize.xs, color: t.textSecondary, marginTop: 2 }}>
                  Vende más rápido aplicando un descuento por sobreproducción.
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
                <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: t.textSecondary }}>
                  Descuento a aplicar
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
                            fontWeight: "800",
                            color: selected ? t.success : t.textSecondary,
                          }}
                        >
                          -{d}%
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
            <Title icon="location">Ubicación de la finca</Title>

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
                <Icon name={coords ? "checkmark-circle" : "location"} size={20} color={coords ? t.success : t.primary} />
              )}
              <Text
                style={{
                  flex: 1,
                  fontSize: fontSize.sm,
                  fontWeight: "700",
                  color: coords ? t.success : t.primary,
                }}
              >
                {locating
                  ? "Obteniendo coordenadas GPS..."
                  : coords
                  ? `Ubicación GPS guardada (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
                  : "Obtener ubicación GPS de la finca"}
              </Text>
            </Pressable>
          </Card>

          <Button
            title="Publicar cosecha"
            variant="accent"
            size="lg"
            full
            icon={<Icon name="checkmark-circle" size={20} color="#FFFFFF" />}
            loading={saving}
            onPress={submit}
          />
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
        borderWidth: 1,
        borderColor: t.border,
      }}
    >
      {children}
    </View>
  );
}

function Title({ icon, children }: { icon?: IconName; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {icon ? <Icon name={icon} size={18} color={t.primary} /> : null}
      <Text style={{ fontSize: fontSize.base, fontWeight: "800", color: t.textPrimary }}>
        {children}
      </Text>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: t.textSecondary }}>{label}</Text>
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
