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
import { PasswordInput } from "../../src/components/PasswordInput";
import { BRAND, LogoMark } from "../../src/components/Logo";
import { fontSize, radius, spacing, type, useTheme } from "../../src/theme";
import { apiErrorMessage, login, register } from "../../src/api/client";
import type { Role } from "../../src/api/types";
import { useAuth } from "../../src/store/auth";
import { showAlert } from "../../src/lib/dialog";
import { SlowActionHint } from "../../src/components/QueryState";

type Mode = "login" | "register";

const ROLES: { key: Role; label: string; icon: string }[] = [
  { key: "BUYER", label: "Comprador", icon: "bag-handle-outline" },
  { key: "PRODUCER", label: "Productor", icon: "preparing" },
  { key: "COURIER", label: "Repartidor", icon: "in_transit" },
];

const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Login() {
  const router = useRouter();
  const t = useTheme();
  const params = useLocalSearchParams<{ role?: string; mode?: string }>();
  const setSession = useAuth((s) => s.setSession);

  const [mode, setMode] = useState<Mode>(params.mode === "login" ? "login" : "register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(
    ROLES.some((r) => r.key === params.role) ? (params.role as Role) : "BUYER"
  );
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";
  const cleanEmail = email.trim().toLowerCase();

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
    if (!EMAIL_RE.test(cleanEmail)) {
      showAlert("Revisa tu correo", "Escríbelo completo, por ejemplo nombre@gmail.com.");
      return;
    }
    if (isRegister && !/^3\d{9}$/.test(phone)) {
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
        ? await register({ name: name.trim(), email: cleanEmail, phone: `+57${phone}`, password, role })
        : await login(cleanEmail, password);
      await setSession(res.user, res.token);
      router.replace("/(tabs)/home");
    } catch (err) {
      const message = apiErrorMessage(err);
      await showAlert(isRegister ? "No se pudo crear la cuenta" : "No se pudo entrar", message);
      // El correo ya tiene cuenta: se pasa a iniciar sesión con ese correo.
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
          <View style={{ gap: spacing[2], marginTop: spacing[2] }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: BRAND.field,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: spacing[3],
              }}
            >
              <LogoMark size={38} />
            </View>
            <Text style={[type.display, { color: t.textPrimary }]}>
              {isRegister ? "Crea tu cuenta" : "Entra a tu cuenta"}
            </Text>
            <Text style={[type.body, { color: t.textSecondary }]}>
              {isRegister
                ? "Compra directo al campo o vende tu cosecha, con tu correo y una contraseña."
                : "Con el correo y la contraseña con que te registraste."}
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
              <Text style={labelStyle}>Correo electrónico</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="nombre@gmail.com"
                placeholderTextColor={t.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType={isRegister ? "emailAddress" : "username"}
                style={inputStyle}
              />
            </View>

            {isRegister ? (
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
                <Text style={{ fontSize: fontSize.sm, color: t.textTertiary, marginTop: 6 }}>
                  Para coordinar las entregas.
                </Text>
              </View>
            ) : null}

            <View>
              <Text style={labelStyle}>Contraseña</Text>
              <PasswordInput
                kind={isRegister ? "new" : "current"}
                value={password}
                onChangeText={setPassword}
                placeholder={isRegister ? `Mínimo ${MIN_PASSWORD} caracteres` : "Tu contraseña"}
                onSubmitEditing={isRegister ? undefined : submit}
                returnKeyType={isRegister ? "next" : "go"}
              />
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
            <SlowActionHint
              active={loading}
              message="Estamos despertando el servidor. La primera vez del día puede tardar hasta un minuto."
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
