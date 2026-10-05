import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { fontSize, radius, spacing, useTheme } from "../theme";
import { Address } from "../api/types";
import { createAddress, apiErrorMessage } from "../api/client";

interface AddressSheetProps {
  visible: boolean;
  addresses: Address[];
  selectedId: string | null;
  onSelect: (address: Address) => void;
  onClose: () => void;
  onCreated: (address: Address) => void;
}

export function AddressSheet({
  visible,
  addresses,
  selectedId,
  onSelect,
  onClose,
  onCreated,
}: AddressSheetProps) {
  const t = useTheme();
  const [mode, setMode] = useState<"list" | "new">("list");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  // Form state
  const [label, setLabel] = useState("Casa");
  const [municipio, setMunicipio] = useState("Pasto");
  const [vereda, setVereda] = useState("");
  const [detail, setDetail] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const resetForm = () => {
    setLabel("Casa");
    setMunicipio("Pasto");
    setVereda("");
    setDetail("");
    setCoords(null);
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso denegado", "Necesitamos acceso a tu ubicación para guardar la dirección.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });

      // Reverse geocode para autocompletar municipio
      try {
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geo?.city) setMunicipio(geo.city);
        if (geo?.street) setDetail((d) => d || geo.street!);
      } catch {
        // reverse geocode puede fallar sin red, no es crítico
      }
    } catch (err) {
      Alert.alert("Error", apiErrorMessage(err));
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (!municipio.trim() || !detail.trim()) {
      Alert.alert("Faltan datos", "Municipio y dirección son obligatorios.");
      return;
    }
    if (!coords) {
      Alert.alert(
        "Ubicación requerida",
        "Usa el botón 'Usar mi ubicación' para guardar las coordenadas. Si no tienes señal, escribe una dirección y presiona el botón de todas formas."
      );
      return;
    }
    setSaving(true);
    try {
      const created = await createAddress({
        label: label.trim() || "Casa",
        municipio: municipio.trim(),
        vereda: vereda.trim() || undefined,
        detail: detail.trim(),
        latitude: coords.lat,
        longitude: coords.lng,
        isDefault: addresses.length === 0,
      });
      onCreated(created);
      resetForm();
      setMode("list");
    } catch (err) {
      Alert.alert("Error al guardar", apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        setMode("list");
        onClose();
      }}
      title={mode === "list" ? "📍 Entregar en" : "Nueva dirección"}
    >
      {mode === "list" ? (
        <View style={{ gap: spacing[3] }}>
          {addresses.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: spacing[6], gap: spacing[2] }}>
              <Text style={{ fontSize: 48 }}>🏠</Text>
              <Text style={{ color: t.textSecondary, textAlign: "center" }}>
                Aún no tienes direcciones guardadas.
              </Text>
            </View>
          ) : (
            addresses.map((addr) => {
              const selected = addr.id === selectedId;
              return (
                <Pressable
                  key={addr.id}
                  onPress={() => {
                    onSelect(addr);
                    onClose();
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing[3],
                    padding: spacing[3],
                    borderRadius: radius.md,
                    borderWidth: 1.5,
                    borderColor: selected ? t.primary : t.border,
                    backgroundColor: selected ? t.primaryLight : t.bgPrimary,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.md,
                      backgroundColor: selected ? t.primary : t.bgSecondary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{addr.label === "Finca" ? "🌾" : "📍"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: t.textPrimary }}>
                      {addr.label} · {addr.municipio}
                    </Text>
                    <Text style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }} numberOfLines={2}>
                      {[addr.vereda, addr.detail].filter(Boolean).join(" — ")}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: radius.full,
                      borderWidth: 2,
                      borderColor: selected ? t.primary : t.border,
                      backgroundColor: selected ? t.primary : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selected ? (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFF" }} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })
          )}

          <Button
            title="+ Agregar nueva dirección"
            variant="outline"
            full
            onPress={() => setMode("new")}
          />
        </View>
      ) : (
        <View style={{ gap: spacing[3] }}>
          <Field label="Etiqueta">
            <View style={{ flexDirection: "row", gap: spacing[2] }}>
              {["Casa", "Trabajo", "Finca", "Otro"].map((l) => (
                <Pressable
                  key={l}
                  onPress={() => setLabel(l)}
                  style={{
                    paddingHorizontal: spacing[3],
                    paddingVertical: 8,
                    borderRadius: radius.full,
                    borderWidth: 1.5,
                    borderColor: label === l ? t.primary : t.border,
                    backgroundColor: label === l ? t.primaryLight : t.bgPrimary,
                  }}
                >
                  <Text
                    style={{
                      fontSize: fontSize.sm,
                      fontWeight: "600",
                      color: label === l ? t.primary : t.textSecondary,
                    }}
                  >
                    {l}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label="Municipio">
            <TextInput
              value={municipio}
              onChangeText={setMunicipio}
              placeholder="Pasto"
              placeholderTextColor={t.textTertiary}
              style={inputStyle(t)}
            />
          </Field>

          <Field label="Vereda / Barrio (opcional)">
            <TextInput
              value={vereda}
              onChangeText={setVereda}
              placeholder="Ej. Vereda El Diviso"
              placeholderTextColor={t.textTertiary}
              style={inputStyle(t)}
            />
          </Field>

          <Field label="Dirección o referencia">
            <TextInput
              value={detail}
              onChangeText={setDetail}
              placeholder="Calle 18 #35-42, cerca a la escuela"
              placeholderTextColor={t.textTertiary}
              multiline
              style={[inputStyle(t), { height: 72, paddingTop: 12, textAlignVertical: "top" }]}
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
                : "Usar mi ubicación actual"}
            </Text>
          </Pressable>

          <View style={{ flexDirection: "row", gap: spacing[2], marginTop: spacing[2] }}>
            <Button
              title="Cancelar"
              variant="ghost"
              style={{ flex: 1 }}
              onPress={() => {
                resetForm();
                setMode("list");
              }}
            />
            <Button title="Guardar" style={{ flex: 2 }} onPress={save} loading={saving} />
          </View>
        </View>
      )}
    </BottomSheet>
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
