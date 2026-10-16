import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../src/components/Button";
import { TopBar } from "../src/components/TopBar";
import { PasswordInput } from "../src/components/PasswordInput";
import { fontSize, spacing, useTheme } from "../src/theme";
import { apiErrorMessage, changePassword } from "../src/api/client";
import { showAlert } from "../src/lib/dialog";

const MIN_PASSWORD = 8;

export default function CambiarContrasena() {
  const router = useRouter();
  const t = useTheme();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const labelStyle = { fontSize: fontSize.sm, color: t.textSecondary, marginBottom: 6, fontWeight: "500" } as const;

  const submit = async () => {
    if (!current) {
      showAlert("Falta tu contraseña actual", "Escríbela para confirmar que eres tú.");
      return;
    }
    if (next.length < MIN_PASSWORD) {
      showAlert("Contraseña muy corta", `La nueva debe tener al menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    if (next !== confirm) {
      showAlert("No coinciden", "Escribe la misma contraseña nueva en los dos campos.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(current, next);
      await showAlert("Contraseña cambiada", "La próxima vez entra con la contraseña nueva.");
      router.back();
    } catch (err) {
      showAlert("No se pudo cambiar", apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={["top"]}>
      <TopBar showBack onBack={() => router.back()} title="Cambiar contraseña" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing[4], gap: spacing[4] }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: fontSize.sm, color: t.textSecondary }}>
            Guárdala en un lugar seguro: si la olvidas, no se puede recuperar desde la app.
          </Text>

          <View>
            <Text style={labelStyle}>Contraseña actual</Text>
            <PasswordInput kind="current" value={current} onChangeText={setCurrent} placeholder="Tu contraseña" />
          </View>

          <View>
            <Text style={labelStyle}>Contraseña nueva</Text>
            <PasswordInput
              kind="new"
              value={next}
              onChangeText={setNext}
              placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
            />
          </View>

          <View>
            <Text style={labelStyle}>Repite la contraseña nueva</Text>
            <PasswordInput
              kind="new"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="La misma de arriba"
              onSubmitEditing={submit}
              returnKeyType="done"
            />
          </View>

          <Button title="Guardar contraseña nueva" onPress={submit} loading={loading} full size="lg" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
