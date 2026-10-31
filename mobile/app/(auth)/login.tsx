import React, { useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { Icon } from "../../src/components/Icon";
import { BRAND, LogoMark } from "../../src/components/Logo";
import { GLASS, GlassButton, GlassCard, GlassField } from "../../src/components/GlassAuth";
import { SmokeyBackground } from "../../src/components/SmokeyBackground";
import { useSlowFlag } from "../../src/components/QueryState";
import { radius, spacing } from "../../src/theme";
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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Login() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
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
  const slow = useSlowFlag(loading);

  const isRegister = mode === "register";
  const cleanEmail = email.trim().toLowerCase();

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
    <View style={{ flex: 1, backgroundColor: GLASS.ground }}>
      <StatusBar style="light" />
      {/* Humo verde animado en la web; en el celular, el resplandor que respira. */}
      <SmokeyBackground color="#2FA35F" groundColor={GLASS.ground} veil={0.35} />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={{ height: 56, paddingHorizontal: spacing[3], justifyContent: "center" }}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(auth)/onboarding"))}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: radius.full,
              backgroundColor: pressed ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)",
              borderWidth: 1,
              borderColor: GLASS.cardBorder,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Icon name="arrow-back" size={22} color={GLASS.text} />
          </Pressable>
        </View>

        {/* Android de borde a borde no encoge la ventana con el teclado: padding en las dos plataformas. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: spacing[4], paddingBottom: spacing[8] }}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              entering={reduceMotion ? undefined : FadeInDown.duration(500)}
              style={{ width: "100%", maxWidth: 420, alignSelf: "center" }}
            >
              <GlassCard beam={false}>
                {/* Sello y encabezado */}
                <View style={{ alignItems: "center", gap: spacing[2], marginBottom: spacing[6] }}>
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      backgroundColor: BRAND.field,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.14)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: spacing[1],
                    }}
                  >
                    <LogoMark size={34} />
                  </View>
                  <Text
                    accessibilityRole="header"
                    style={{ color: GLASS.text, fontSize: 24, lineHeight: 30, fontWeight: "800", letterSpacing: -0.4, textAlign: "center" }}
                  >
                    {isRegister ? "Crea tu cuenta" : "Bienvenido de nuevo"}
                  </Text>
                  <Text style={{ color: GLASS.textSecondary, fontSize: 15, lineHeight: 21, textAlign: "center" }}>
                    {isRegister
                      ? "Compra directo al campo o vende tu cosecha."
                      : "Entra para seguir comprando en MercaJusto."}
                  </Text>
                </View>

                <View style={{ gap: spacing[5] }}>
                  {isRegister ? (
                    <GlassField
                      label="Nombre completo"
                      icon="person-outline"
                      value={name}
                      onChangeText={setName}
                      placeholder="Ej. María Rodríguez"
                      autoComplete="name"
                      textContentType="name"
                    />
                  ) : null}

                  <GlassField
                    label="Correo electrónico"
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="nombre@gmail.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType={isRegister ? "emailAddress" : "username"}
                  />

                  {isRegister ? (
                    <GlassField
                      label="Celular"
                      icon="call-outline"
                      prefix="+57"
                      value={phone}
                      onChangeText={(v) => setPhone(v.replace(/\D/g, "").slice(0, 10))}
                      placeholder="300 123 4567"
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      textContentType="telephoneNumber"
                      hint="Para coordinar las entregas."
                    />
                  ) : null}

                  <GlassField
                    label="Contraseña"
                    icon="lock-closed-outline"
                    password
                    value={password}
                    onChangeText={setPassword}
                    placeholder={isRegister ? `Mínimo ${MIN_PASSWORD} caracteres` : "Tu contraseña"}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    textContentType={isRegister ? "newPassword" : "password"}
                    onSubmitEditing={isRegister ? undefined : submit}
                    returnKeyType={isRegister ? "next" : "go"}
                  />

                  {isRegister ? (
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: GLASS.textSecondary, fontSize: 13, fontWeight: "600" }}>Soy...</Text>
                      <View style={{ flexDirection: "row", gap: spacing[2] }} accessibilityRole="radiogroup">
                        {ROLES.map((r) => {
                          const active = role === r.key;
                          return (
                            <Pressable
                              key={r.key}
                              onPress={() => setRole(r.key)}
                              accessibilityRole="radio"
                              accessibilityState={{ checked: active }}
                              style={{
                                flex: 1,
                                minHeight: 72,
                                padding: spacing[2],
                                borderRadius: radius.md,
                                borderWidth: 1.5,
                                borderColor: active ? GLASS.focus : GLASS.fieldBorder,
                                backgroundColor: active ? "rgba(61,190,114,0.14)" : GLASS.field,
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 4,
                              }}
                            >
                              <Icon name={r.icon} size={24} color={active ? GLASS.focus : GLASS.textSecondary} />
                              <Text style={{ fontSize: 13, fontWeight: "700", color: active ? GLASS.text : GLASS.textSecondary }}>
                                {r.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}

                  <View style={{ marginTop: spacing[2], gap: spacing[2] }}>
                    <GlassButton title={isRegister ? "Crear cuenta y entrar" : "Entrar"} onPress={submit} loading={loading} />
                    {slow ? (
                      <Text
                        accessibilityLiveRegion="polite"
                        style={{ color: GLASS.textSecondary, fontSize: 13, textAlign: "center" }}
                      >
                        Estamos despertando el servidor. La primera vez del día puede tardar hasta un minuto.
                      </Text>
                    ) : null}
                  </View>

                  <View style={{ height: 1, backgroundColor: GLASS.cardBorder, marginVertical: spacing[1] }} />

                  <Pressable
                    onPress={() => switchMode(isRegister ? "login" : "register")}
                    accessibilityRole="button"
                    style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
                  >
                    <Text style={{ textAlign: "center", color: GLASS.textSecondary, fontSize: 14 }}>
                      {isRegister ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
                      <Text style={{ color: GLASS.focus, fontWeight: "800" }}>{isRegister ? "Inicia sesión" : "Crea una"}</Text>
                    </Text>
                  </Pressable>
                </View>
              </GlassCard>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
