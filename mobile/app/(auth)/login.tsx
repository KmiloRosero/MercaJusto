import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { TopBar } from "../../src/components/TopBar";
import { Icon } from "../../src/components/Icon";
import { fontSize, radius, spacing, useTheme } from "../../src/theme";
import { apiErrorMessage, login, register } from "../../src/api/client";
import type { Role } from "../../src/api/types";
import { useAuth } from "../../src/store/auth";
import { showAlert } from "../../src/lib/dialog";

type Mode = "login" | "register";

const ROLES: { key: Role; label: string; icon: string }[] = [
  { key: "BUYER", label: "Comprador", icon: "bag-handle-outline" },
  { key: "PRODUCER", label: "Productor", icon: "preparing" },
  { key: "COURIER", label: "Repartidor", icon: "in_transit" },
];

const MIN_PASSWORD = 8;

export default function Login() {
  const router = useRouter();
  const t = useTheme();
  const params = useLocalSearchParams<{ role?: string; mode?: string }>();
  const setSession = useAuth((s) => s.setSession);

  const [mode, setMode] = useState<Mode>(params.mode === "login" ? "login" : "register");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>(
    ROLES.some((r) => r.key === params.role) ? (params.role as Role) : "BUYER"
  );
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const inputStyle = {
    height: 48,
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    backgroundColor: t.bgInput,
    borderWidth: 1.5,
    borderColor: t.border,
    fontSize: fontSize.base,
    color: t.textPrimary,
  } as const;
  const labelStyle = { fontSize: fontSize.sm, color: t.textSecondary, marginBottom: 6, fontWeight: "500" } as const;

  const switchMode = (next: Mode) => {
    setMode(next);
    setPassword("");
  };

  const submit = async () => {
    if (isRegister && name.trim().length < 2) {
      showAlert("Falta tu nombre", "Escribe tu nombre para crear la cuenta.");
      return;
    }
    if (!/^3\d{9}$/.test(phone)) {
      showAlert("Revisa tu celular", "Escribe tu celular de 10 dígitos; empieza por 3.");
      return;
    }
    if (isRegister && password.length < MIN_PASSWORD) {
      showAlert("Contraseña muy corta", `Usa al menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    if (!password) {
      showAlert("Falta la contraseña", "Escribe tu contraseña.");
      return;
    }

    setLoading(true);
    try {
      const res = isRegister
        ? await register({ name: name.trim(), phone: `+57${phone}`, password, role })
        : await login(`+57${phone}`, password);
      await setSession(res.user, res.token);
      router.replace("/(tabs)/home");
    } catch (err) {
      const message = apiErrorMessage(err);
      await showAlert(isRegister ? "No se pudo crear la cuenta" : "No se pudo entrar", message);
      // El celular ya tiene cuenta: se pasa a iniciar sesión con ese número.
      if (isRegister && message.includes("Inicia sesión")) switchMode("login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={["top"]}>
      <TopBar showBack onBack={() => router.back()} title={isRegister ? "Crear cuenta" : "Iniciar sesión"} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing[4], gap: spacing[5] }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: "center", gap: spacing[2], marginTop: spacing[4] }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: radius.full,
                backgroundColor: t.primaryLight,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: spacing[2],
              }}
            >
              <Icon name={isRegister ? "person-outline" : "shield-checkmark-outline"} size={36} color={t.primary} />
            </View>
            <Text style={{ fontSize: fontSize["2xl"], fontWeight: "800", color: t.textPrimary }}>
              {isRegister ? "Crea tu cuenta" : "Entra a tu cuenta"}
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: t.textSecondary, textAlign: "center" }}>
              {isRegister
                ? "Con tu celular y una contraseña. Sin códigos ni correos."
                : "Con el celular y la contraseña con que te registraste."}
            </Text>
          </View>

          <View style={{ gap: spacing[3] }}>
            {isRegister ? (
              <View>
                <Text style={labelStyle}>Nombre completo</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Ej. María Rodríguez"
                  placeholderTextColor={t.textTertiary}
                  autoComplete="name"
                  textContentType="name"
                  style={inputStyle}
                />
              </View>
            ) : null}

            <View>
              <Text style={labelStyle}>Celular</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
                <View style={{ ...inputStyle, justifyContent: "center" }}>
                  <Text style={{ color: t.textPrimary, fontSize: fontSize.base }}>+57</Text>
                </View>
                <TextInput
                  value={phone}
                  onChangeText={(v) => setPhone(v.replace(/\D/g, "").slice(0, 10))}
                  placeholder="300 123 4567"
                  placeholderTextColor={t.textTertiary}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  style={{ ...inputStyle, flex: 1 }}
                />
              </View>
            </View>

            <View>
              <Text style={labelStyle}>Contraseña</Text>
              <View style={{ justifyContent: "center" }}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={isRegister ? `Mínimo ${MIN_PASSWORD} caracteres` : "Tu contraseña"}
                  placeholderTextColor={t.textTertiary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  textContentType={isRegister ? "newPassword" : "password"}
                  onSubmitEditing={isRegister ? undefined : submit}
                  returnKeyType={isRegister ? "next" : "go"}
                  style={{ ...inputStyle, paddingRight: 52 }}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  hitSlop={8}
                  style={{ position: "absolute", right: 0, width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
                >
                  <Icon name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={t.textSecondary} />
                </Pressable>
              </View>
            </View>

            {isRegister ? (
              <View>
                <Text style={labelStyle}>Soy...</Text>
                <View style={{ flexDirection: "row", gap: spacing[2] }}>
                  {ROLES.map((r) => (
                    <Pressable
                      key={r.key}
                      onPress={() => setRole(r.key)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: role === r.key }}
                      style={{
                        flex: 1,
                        minHeight: 72,
                        padding: spacing[3],
                        borderRadius: radius.md,
                        borderWidth: 1.5,
                        borderColor: role === r.key ? t.primary : t.border,
                        backgroundColor: role === r.key ? t.primaryLight : t.bgPrimary,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name={r.icon} size={24} color={role === r.key ? t.primary : t.textSecondary} />
                      <Text
                        style={{
                          fontSize: fontSize.sm,
                          fontWeight: "600",
                          color: role === r.key ? t.primary : t.textSecondary,
                          marginTop: 4,
                        }}
                      >
                        {r.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <Button
              title={isRegister ? "Crear cuenta y entrar" : "Entrar"}
              onPress={submit}
              loading={loading}
              full
              size="lg"
            />

            <Pressable
              onPress={() => switchMode(isRegister ? "login" : "register")}
              accessibilityRole="button"
              style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: spacing[2] }}
            >
              <Text style={{ textAlign: "center", color: t.textSecondary, fontSize: fontSize.sm }}>
                {isRegister ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
                <Text style={{ color: t.primary, fontWeight: "700" }}>
                  {isRegister ? "Inicia sesión" : "Crea una"}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
