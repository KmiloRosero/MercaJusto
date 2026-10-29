import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { TopBar } from "../src/components/TopBar";
import { Button } from "../src/components/Button";
import { Icon, IconName } from "../src/components/Icon";
import { fontSize, formatCOP, radius, spacing, type, useTheme } from "../src/theme";
import { ProductCard } from "../src/components/ProductCard";
import { useAuth } from "../src/store/auth";
import type { Product } from "../src/api/types";
import { apiErrorMessage, createProduct, getCategories, isRetryableError, uploadImage } from "../src/api/client";
import { chooseOption, confirmDialog, showAlert } from "../src/lib/dialog";
import { DEFAULT_COORDS, municipioCoords } from "../src/lib/municipios";
import { toast } from "../src/store/toast";

import { clearPublishDraft, draftHasContent, loadPublishDraft, PublishDraft, savePublishDraft } from "../src/lib/publishDraft";
import { usePublishQueue } from "../src/store/publishQueue";
import { SlowActionHint } from "../src/components/QueryState";
import { FreshnessOffer } from "../src/components/FreshnessOffer";
import { expiresAtFor } from "../src/lib/freshness";
const UNITS = ["Kilo", "Libra", "Atado", "Docena", "Unidad", "Litro"];

// Una pregunta por pantalla: menos decisiones a la vez para quien publica desde el campo.
const STEPS = ["¿Qué vas a vender?", "¿A cuánto lo vendes?", "¿Dónde está tu cosecha?"];

const PLURALS: Record<string, string> = {
  Kilo: "kilos",
  Libra: "libras",
  Atado: "atados",
  Docena: "docenas",
  Unidad: "unidades",
  Litro: "litros",
};
const pluralUnit = (u: string) => PLURALS[u] ?? u.toLowerCase();

type FieldKey = "name" | "category" | "price" | "stock" | "plaza" | "municipio";

export default function PublicarCosecha() {
  const router = useRouter();
  const t = useTheme();
  const queryClient = useQueryClient();
  const enqueuePublication = usePublishQueue((s) => s.enqueue);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const user = useAuth((s) => s.user);
  // La finca del productor (o su dirección principal) llena el lugar por defecto.
  const farm =
    user?.addresses?.find((a) => a.label === "Finca") ??
    user?.addresses?.find((a) => a.isDefault) ??
    user?.addresses?.[0];

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [traditionalPrice, setTraditionalPrice] = useState("");
  const [unit, setUnit] = useState("Kilo");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [isSurplus, setIsSurplus] = useState(false);
  const [discountPct, setDiscountPct] = useState(20);
  const [spoilsIn, setSpoilsIn] = useState<number | null>(null);
  const [municipio, setMunicipio] = useState(farm?.municipio ?? "Pasto");
  const [vereda, setVereda] = useState(farm?.vereda ?? "");
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string | null>(null);

  // Borrador: se restaura al entrar y se guarda mientras se escribe.
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const currentDraft: PublishDraft = {
    name, categoryId, price, traditionalPrice, unit, stock, description,
    isSurplus, discountPct, spoilsIn, municipio, vereda, coords, photoUri, photoMime,
  };

  const applyDraft = (d: PublishDraft) => {
    setName(d.name);
    setCategoryId(d.categoryId);
    setPrice(d.price);
    setTraditionalPrice(d.traditionalPrice);
    setUnit(d.unit);
    setStock(d.stock);
    setDescription(d.description);
    setIsSurplus(d.isSurplus);
    setDiscountPct(d.discountPct);
    setSpoilsIn(d.spoilsIn ?? null);
    setMunicipio(d.municipio);
    setVereda(d.vereda);
    setCoords(d.coords);
    setPhotoUri(d.photoUri);
    setPhotoMime(d.photoMime);
  };

  useEffect(() => {
    loadPublishDraft().then((d) => {
      if (d && draftHasContent(d)) {
        applyDraft(d);
        setDraftRestored(true);
      }
      setDraftLoaded(true);
    });
     
  }, []);

  const draftJson = JSON.stringify(currentDraft);
  useEffect(() => {
    if (!draftLoaded) return;
    const id = setTimeout(() => savePublishDraft(JSON.parse(draftJson)), 400);
    return () => clearTimeout(id);
  }, [draftJson, draftLoaded]);

  const discardDraft = async () => {
    const ok = await confirmDialog("¿Empezar de nuevo?", "Se borrará lo que habías escrito.", {
      confirmText: "Borrar borrador",
      destructive: true,
    });
    if (!ok) return;
    await clearPublishDraft();
    applyDraft({
      name: "", categoryId: null, price: "", traditionalPrice: "", unit: "Kilo", stock: "",
      description: "", isSurplus: false, discountPct: 20, spoilsIn: null, municipio: farm?.municipio ?? "Pasto", vereda: farm?.vereda ?? "",
      coords: null, photoUri: null, photoMime: null,
    });
    setDraftRestored(false);
    setErrors({});
    setStep(0);
  };

  const pickPhoto = async (useCamera: boolean) => {
    try {
      const perm = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showAlert(
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
        setPhotoMime(result.assets[0].mimeType ?? null);
      }
    } catch {
      showAlert("No se pudo usar la foto", "Intenta tomarla de nuevo o elige otra de tu galería.");
    }
  };

  const choosePhotoSource = async () => {
    // En web no hay cámara nativa: se abre directamente el selector de archivos
    const source = await chooseOption("Foto de cosecha", "Selecciona el origen", [
      { key: "camera", text: "Tomar foto con cámara" },
      { key: "gallery", text: "Elegir de galería", web: true },
    ]);
    if (source) pickPhoto(source === "camera");
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showAlert(
          "Ubicación no disponible",
          "Sin permiso de ubicación usaremos la ubicación aproximada del municipio."
        );
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
    } catch {
      showAlert("No se pudo obtener la ubicación", "Usaremos la ubicación aproximada del municipio.");
    } finally {
      setLocating(false);
    }
  };

  const clearError = (key: FieldKey) =>
    setErrors((e) => {
      if (!e[key]) return e;
      const { [key]: _gone, ...rest } = e;
      return rest;
    });

  /** Errores del paso, escritos para quien los lee en el campo: qué falta y cómo resolverlo. */
  const validateStep = (n: number): Partial<Record<FieldKey, string>> => {
    const e: Partial<Record<FieldKey, string>> = {};
    if (n === 0) {
      if (name.trim().length < 2) e.name = "Escribe el nombre de lo que vas a vender.";
      if (!categoryId) e.category = "Elige una categoría.";
    }
    if (n === 1) {
      if (!(Number(price) > 0)) e.price = `Escribe el precio por ${unit.toLowerCase()}.`;
      if (!(Math.floor(Number(stock)) > 0)) e.stock = `Escribe cuántos ${pluralUnit(unit)} tienes.`;
      if (traditionalPrice && !(Number(traditionalPrice) > 0)) e.plaza = "Escribe un precio mayor que 0 o déjalo vacío.";
    }
    if (n === 2) {
      if (!municipio.trim()) e.municipio = "Escribe el municipio de tu finca.";
    }
    return e;
  };

  const showStep = (n: number) => {
    setStep(n);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const goNext = () => {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length === 0) showStep(step + 1);
  };

  const goBack = () => {
    if (step > 0) {
      setErrors({});
      showStep(step - 1);
    } else {
      router.back();
    }
  };

  // El botón Atrás del sistema retrocede un paso antes de salir del formulario.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step === 0) return false;
      goBack();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const category = categories.find((c) => c.id === categoryId);
  const preview: Product | null =
    Number(price) > 0 && name.trim()
      ? {
          id: "preview",
          producerId: user?.id ?? "",
          categoryId: categoryId ?? "",
          name: name.trim(),
          price: Math.round(Number(price)),
          traditionalPrice: Number(traditionalPrice) > 0 ? Math.round(Number(traditionalPrice)) : null,
          unit: unit.toLowerCase(),
          stock: Math.max(1, Math.floor(Number(stock)) || 1),
          photoUrl: photoUri,
          isSurplus,
          discountPct: isSurplus ? discountPct : 0,
          expiresAt: spoilsIn !== null ? expiresAtFor(spoilsIn) : null,
          municipio: municipio.trim() || "Nariño",
          vereda: vereda.trim() || null,
          latitude: 0,
          longitude: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          category,
          producer: user ? { id: user.id, name: user.name } as Product["producer"] : undefined,
        }
      : null;

  const submit = async () => {
    // Revisa todos los pasos; si algo falta, vuelve al paso donde está.
    for (let n = 0; n < STEPS.length; n++) {
      const e = validateStep(n);
      if (Object.keys(e).length > 0) {
        setErrors(e);
        showStep(n);
        return;
      }
    }
    const numPrice = Math.round(Number(price));
    const numStock = Math.floor(Number(stock));
    const numTraditional = traditionalPrice ? Math.round(Number(traditionalPrice)) : undefined;

    // Sin GPS: cabecera del municipio escrito (o Pasto si no lo conocemos)
    const farmCoords =
      farm && farm.municipio.trim().toLowerCase() === municipio.trim().toLowerCase()
        ? { lat: farm.latitude, lng: farm.longitude }
        : null;
    const defaultCoords = coords ?? farmCoords ?? municipioCoords(municipio) ?? DEFAULT_COORDS;
    const input = {
      categoryId: categoryId!, // validado en validateStep(0)
      name: name.trim(),
      description: description.trim() || undefined,
      price: numPrice,
      traditionalPrice: numTraditional,
      unit,
      stock: numStock,
      isSurplus,
      discountPct: isSurplus ? discountPct : 0,
      expiresAt: spoilsIn !== null ? expiresAtFor(spoilsIn) : undefined,
      municipio: municipio.trim(),
      vereda: vereda.trim() || undefined,
      latitude: defaultCoords.lat,
      longitude: defaultCoords.lng,
    };

    setSaving(true);
    try {
      let serverPhotoUrl: string | undefined = undefined;
      if (photoUri && !photoUri.startsWith("http")) {
        serverPhotoUrl = await uploadImage(photoUri, photoMime);
      } else if (photoUri) {
        serverPhotoUrl = photoUri;
      }

      await createProduct({ ...input, photoUrl: serverPhotoUrl });

      await clearPublishDraft();
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("¡Publicación exitosa! Tu cosecha ya está en el catálogo");
      router.replace("/(tabs)/home");
    } catch (err) {
      if (isRetryableError(err)) {
        // Sin señal: la cosecha pasa a la cola y se publica sola al volver la conexión.
        await enqueuePublication({ input, photoUri, photoMime });
        await clearPublishDraft();
        toast.info("Sin señal: tu cosecha se publicará sola cuando vuelva la conexión");
        router.replace("/(tabs)/home");
      } else {
        showAlert("No se pudo publicar", apiErrorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={["top"]}>
      <TopBar showBack onBack={goBack} title="Publicar cosecha" />

      {/* Progreso: tres pasos cortos */}
      <View style={{ paddingHorizontal: spacing[5], paddingTop: spacing[3], gap: spacing[2], backgroundColor: t.bgPrimary }}>
        <View style={{ flexDirection: "row", gap: spacing[1] }}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? t.primary : t.gray200 }}
            />
          ))}
        </View>
        <Text style={{ fontSize: fontSize.sm, color: t.textSecondary }} accessibilityLiveRegion="polite">
          Paso {step + 1} de {STEPS.length}
        </Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: spacing[5], paddingTop: spacing[4], gap: spacing[6], paddingBottom: spacing[10] }}
          keyboardShouldPersistTaps="handled"
        >
          {draftRestored ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
                padding: spacing[3],
                borderRadius: radius.md,
                backgroundColor: t.primaryLight,
              }}
            >
              <Icon name="document-text-outline" size={20} color={t.onPrimaryLight} />
              <Text style={{ flex: 1, fontSize: fontSize.sm, color: t.onPrimaryLight, lineHeight: 18 }}>
                Recuperamos lo que habías escrito.
              </Text>
              <Pressable onPress={discardDraft} hitSlop={15} accessibilityRole="button">
                <Text style={{ fontSize: fontSize.sm, fontWeight: "700", color: t.onPrimaryLight }}>Empezar de nuevo</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={[type.title, { color: t.textPrimary }]} accessibilityRole="header">
            {STEPS[step]}
          </Text>

          {step === 0 ? (
            <Card>
              <Pressable
                onPress={choosePhotoSource}
                accessibilityRole="button"
                accessibilityLabel={photoUri ? "Cambiar la foto" : "Tomar o subir una foto"}
                style={{
                  height: 168,
                  borderRadius: radius.lg,
                  borderWidth: 1.5,
                  borderStyle: photoUri ? "solid" : "dashed",
                  borderColor: photoUri ? t.primary : t.border,
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
                    <Text style={{ fontSize: fontSize.base, fontWeight: "700", color: t.textPrimary }}>Tomar o subir una foto</Text>
                    <Text style={{ fontSize: fontSize.sm, color: t.textSecondary }}>Con foto se vende más</Text>
                  </View>
                )}
              </Pressable>
              {photoUri ? (
                <View style={{ flexDirection: "row", gap: spacing[2] }}>
                  <Button title="Cambiar foto" variant="ghost" size="sm" style={{ flex: 1 }} onPress={choosePhotoSource} />
                  <Button title="Quitar foto" variant="outline" size="sm" style={{ flex: 1 }} onPress={() => setPhotoUri(null)} />
                </View>
              ) : null}

              <Field label="Nombre del producto" error={errors.name}>
                <TextInput
                  value={name}
                  onChangeText={(v) => {
                    setName(v);
                    clearError("name");
                  }}
                  placeholder="Ej. Papa criolla"
                  placeholderTextColor={t.textTertiary}
                  style={inputStyle(t, !!errors.name)}
                />
              </Field>

              <Field label="Categoría" error={errors.category}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
                  {categories.map((c) => {
                    const selected = c.id === categoryId;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => {
                          setCategoryId(c.id);
                          clearError("category");
                        }}
                        hitSlop={{ top: 4, bottom: 4 }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        style={{
                          minHeight: 40,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          paddingHorizontal: spacing[3],
                          borderRadius: radius.full,
                          borderWidth: 1.5,
                          borderColor: selected ? t.primary : t.border,
                          backgroundColor: selected ? t.primaryLight : t.bgPrimary,
                        }}
                      >
                        <Icon name={selected ? "checkmark" : c.name} size={16} color={selected ? t.onPrimaryLight : t.textSecondary} />
                        <Text style={{ fontSize: fontSize.sm, fontWeight: "700", color: selected ? t.onPrimaryLight : t.textSecondary }}>
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
                  placeholder="Ej. Cosechada esta mañana, lavada y seleccionada"
                  placeholderTextColor={t.textTertiary}
                  multiline
                  style={[inputStyle(t), { height: 80, paddingTop: 12, textAlignVertical: "top" }]}
                />
              </Field>
            </Card>
          ) : null}

          {step === 1 ? (
            <Card>
              <Field label="¿Cómo lo vendes?">
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
                  {UNITS.map((u) => {
                    const selected = u === unit;
                    return (
                      <Pressable
                        key={u}
                        onPress={() => setUnit(u)}
                        hitSlop={{ top: 4, bottom: 4 }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        style={{
                          minHeight: 40,
                          justifyContent: "center",
                          paddingHorizontal: spacing[4],
                          borderRadius: radius.full,
                          borderWidth: 1.5,
                          borderColor: selected ? t.primary : t.border,
                          backgroundColor: selected ? t.primaryLight : t.bgPrimary,
                        }}
                      >
                        <Text style={{ fontSize: fontSize.sm, fontWeight: "700", color: selected ? t.onPrimaryLight : t.textSecondary }}>
                          Por {u.toLowerCase()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>

              <Field label={`Precio por ${unit.toLowerCase()}`} error={errors.price}>
                <TextInput
                  value={price}
                  onChangeText={(v) => {
                    setPrice(v.replace(/\D/g, ""));
                    clearError("price");
                  }}
                  placeholder="Ej. 8.500"
                  keyboardType="numeric"
                  placeholderTextColor={t.textTertiary}
                  style={inputStyle(t, !!errors.price)}
                />
              </Field>

              <Field label={`¿Cuántos ${pluralUnit(unit)} tienes para vender?`} error={errors.stock}>
                <TextInput
                  value={stock}
                  onChangeText={(v) => {
                    setStock(v.replace(/\D/g, ""));
                    clearError("stock");
                  }}
                  placeholder="Ej. 50"
                  keyboardType="numeric"
                  placeholderTextColor={t.textTertiary}
                  style={inputStyle(t, !!errors.stock)}
                />
              </Field>

              <Field
                label={`Precio en plaza de mercado por ${unit.toLowerCase()} (opcional)`}
                help={errors.plaza ? undefined : plazaHelp(Number(price), Number(traditionalPrice), unit)}
                error={errors.plaza}
              >
                <TextInput
                  value={traditionalPrice}
                  onChangeText={(v) => {
                    setTraditionalPrice(v.replace(/\D/g, ""));
                    clearError("plaza");
                  }}
                  placeholder="Ej. 12.000"
                  keyboardType="numeric"
                  placeholderTextColor={t.textTertiary}
                  style={inputStyle(t, !!errors.plaza)}
                />
              </Field>
            </Card>
          ) : null}

          {step === 2 ? (
            <>
              <Card>
                <FreshnessOffer
                  spoilsIn={spoilsIn}
                  onSpoilsIn={setSpoilsIn}
                  isSurplus={isSurplus}
                  onSurplus={setIsSurplus}
                  discountPct={discountPct}
                  onDiscount={setDiscountPct}
                  price={Number(price) || 0}
                  unit={unit.toLowerCase()}
                />
              </Card>

              <Card>
                <Title icon="location">¿Dónde está tu finca?</Title>
                <Field label="Municipio" error={errors.municipio}>
                  <TextInput
                    value={municipio}
                    onChangeText={(v) => {
                      setMunicipio(v);
                      clearError("municipio");
                    }}
                    placeholder="Ej. Túquerres"
                    placeholderTextColor={t.textTertiary}
                    style={inputStyle(t, !!errors.municipio)}
                  />
                </Field>
                <Field label="Vereda (opcional)">
                  <TextInput
                    value={vereda}
                    onChangeText={setVereda}
                    placeholder="Ej. El Diviso"
                    placeholderTextColor={t.textTertiary}
                    style={inputStyle(t)}
                  />
                </Field>
                <Pressable
                  onPress={locating ? undefined : useMyLocation}
                  accessibilityRole="button"
                  style={{
                    minHeight: 48,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing[2],
                    padding: spacing[3],
                    borderRadius: radius.md,
                    borderWidth: 1.5,
                    borderStyle: "dashed",
                    borderColor: coords ? t.success : t.primary,
                    backgroundColor: coords ? t.successLight : t.primaryLight,
                  }}
                >
                  {locating ? (
                    <ActivityIndicator size="small" color={t.primary} />
                  ) : (
                    <Icon name={coords ? "checkmark-circle" : "location"} size={20} color={coords ? t.success : t.onPrimaryLight} />
                  )}
                  <Text style={{ flex: 1, fontSize: fontSize.sm, fontWeight: "700", color: coords ? t.success : t.onPrimaryLight }}>
                    {locating
                      ? "Buscando tu ubicación…"
                      : coords
                      ? "Ubicación de la finca guardada"
                      : "Usar mi ubicación actual (opcional)"}
                  </Text>
                </Pressable>
              </Card>

              {preview ? (
                <View style={{ gap: spacing[3] }}>
                  <Title icon="eye-outline">Así verán tu cosecha</Title>
                  <View style={{ width: "50%" }}>
                    <ProductCard product={preview} />
                  </View>
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>

        {/* Acciones del paso, siempre al alcance del pulgar */}
        <View
          style={{
            flexDirection: "row",
            gap: spacing[3],
            paddingHorizontal: spacing[4],
            paddingTop: spacing[3],
            paddingBottom: spacing[3] + insets.bottom,
            backgroundColor: t.bgCard,
            borderTopWidth: 1,
            borderTopColor: t.border,
          }}
        >
          {step > 0 ? <Button title="Atrás" variant="outline" size="lg" onPress={goBack} /> : null}
          <View style={{ flex: 1 }}>
            {step < STEPS.length - 1 ? (
              <Button
                title="Siguiente"
                size="lg"
                full
                trailingIcon={<Icon name="arrow-forward" size={20} color={t.onPrimary} />}
                onPress={goNext}
              />
            ) : (
              <Button
                title="Publicar cosecha"
                size="lg"
                full
                icon={<Icon name="checkmark-circle" size={20} color={t.onPrimary} />}
                loading={saving}
                onPress={submit}
              />
            )}
            <View style={{ marginTop: saving ? 6 : 0 }}>
              <SlowActionHint
                active={saving}
                message={
                  photoUri
                    ? "Subiendo la foto. Con señal débil puede tardar un poco; tu cosecha queda guardada."
                    : "Publicando tu cosecha. Con señal débil puede tardar un poco."
                }
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Grupo de campos de un paso: plano sobre el fondo blanco, sin tarjeta dentro de la pantalla. */
function Card({ children }: { children: React.ReactNode }) {
  return <View style={{ gap: spacing[4] }}>{children}</View>;
}

function Title({ icon, children }: { icon?: IconName; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {icon ? <Icon name={icon} size={18} color={t.primary} /> : null}
      <Text style={[type.headline, { color: t.textPrimary }]} accessibilityRole="header">
        {children}
      </Text>
    </View>
  );
}

function Field({
  label,
  help,
  error,
  children,
}: {
  label: string;
  help?: { text: string; tone: "info" | "good" | "warn" };
  error?: string;
  children: React.ReactNode;
}) {
  const t = useTheme();
  const helpColor = help?.tone === "good" ? t.success : help?.tone === "warn" ? t.warning : t.textSecondary;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: t.textSecondary }}>{label}</Text>
      {children}
      {error ? (
        <View accessibilityRole="alert" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="alert-circle" size={16} color={t.danger} />
          <Text style={{ flex: 1, fontSize: fontSize.sm, color: t.danger, lineHeight: 18 }}>{error}</Text>
        </View>
      ) : help ? (
        <Text style={{ fontSize: fontSize.sm, color: helpColor, lineHeight: 18 }}>{help.text}</Text>
      ) : null}
    </View>
  );
}

/** Ayuda del precio de plaza: explica para qué sirve y anticipa lo que verá el comprador. */
function plazaHelp(price: number, plaza: number, unit: string): { text: string; tone: "info" | "good" | "warn" } {
  if (!plaza) return { text: "Si lo pones, los compradores ven cuánto se ahorran contigo.", tone: "info" };
  if (!price) return { text: "Escribe también tu precio para calcular el ahorro.", tone: "info" };
  if (plaza <= price) return { text: "Para mostrar ahorro, el precio en plaza debe ser mayor que el tuyo.", tone: "warn" };
  return { text: `Los compradores verán: ahorras ${formatCOP(plaza - price)} por ${unit.toLowerCase()}.`, tone: "good" };
}

function inputStyle(t: ReturnType<typeof useTheme>, invalid = false) {
  return {
    height: 48,
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    backgroundColor: t.bgInput,
    borderWidth: 1.5,
    borderColor: invalid ? t.danger : t.border,
    fontSize: fontSize.base,
    color: t.textPrimary,
  } as const;
}
