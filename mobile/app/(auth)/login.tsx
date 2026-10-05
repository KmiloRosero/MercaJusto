import React, { useEffect, useState } from "react";
import {
  Alert,
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
import { requestOtp, verifyOtp, apiErrorMessage } from "../../src/api/client";
import { useAuth } from "../../src/store/auth";

type Step = "phone" | "code" | "register";

export default function Login() {
  const router = useRouter();
  const t = useTheme();
  const params = useLocalSearchParams<{ role?: string }>();
  const setSession = useAuth((s) => s.setSession);

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"BUYER" | "PRODUCER">(
    (params.role as "BUYER" | "PRODUCER") || "BUYER"
  );
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const sendOtp = async () => {
    if (phone.replace(/\D/g, "").length < 10) {
      Alert.alert("Teléfono inválido", "Ingresa un número de 10 dígitos");
      return;
    }
    setLoading(true);
    try {
      const fullPhone = phone.startsWith("+") ? phone : `+57${phone}`;
      const res = await requestOtp(fullPhone);
      setCountdown(60);
      setStep("code");
      if (res.devCode) {
        Alert.alert("Modo desarrollo", `Código OTP: ${res.devCode}`);
      }
    } catch (err) {
      Alert.alert("Error", apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const confirmOtp = async (withRegistration = false) => {
    if (code.length !== 6) {
      Alert.alert("Código inválido", "El código tiene 6 dígitos");
      return;
    }
    setLoading(true);
    try {
      const fullPhone = phone.startsWith("+") ? phone : `+57${phone}`;
      const res = await verifyOtp(
        fullPhone,
        code,
        withRegistration ? { name, role } : undefined
      );
      await setSession(res.user, res.token);
      router.replace("/(tabs)/home");
    } catch (err) {
      const msg = apiErrorMessage(err);
      if (msg === "USUARIO_NUEVO") {
        setStep("register");
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={["top"]}>
      <TopBar showBack onBack={() => router.back()} title="Iniciar sesión" />
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
              <Icon name={step === "phone" ? "call" : "shield-checkmark-outline"} size={36} color={t.primary} />
            </View>
            <Text style={{ fontSize: fontSize["2xl"], fontWeight: "800", color: t.textPrimary }}>
              {step === "phone"
                ? "Ingresa tu celular"
                : step === "code"
                ? "Verifica tu código"
                : "Crea tu cuenta"}
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: t.textSecondary, textAlign: "center" }}>
              {step === "phone"
                ? "Te enviaremos un código de 6 dígitos por SMS."
                : step === "code"
                ? `Enviamos un código al ${phone}. Revisa tus mensajes.`
                : "Primera vez en MercaJusto. Cuéntanos quién eres."}
            </Text>
          </View>

          {step === "phone" ? (
            <View style={{ gap: spacing[3] }}>
              <Text style={{ fontSize: fontSize.sm, color: t.textSecondary, fontWeight: "500" }}>
                Número de celular
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
                <View
                  style={{
                    height: 48,
                    paddingHorizontal: spacing[4],
                    borderRadius: radius.md,
                    backgroundColor: t.bgInput,
                    borderWidth: 1.5,
                    borderColor: t.border,
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: fontSize.base }}>+57</Text>
                </View>
                <TextInput
                  value={phone}
                  onChangeText={(v) => setPhone(v.replace(/\D/g, "").slice(0, 10))}
                  placeholder="300 123 4567"
                  placeholderTextColor={t.textTertiary}
                  keyboardType="phone-pad"
                  style={{
                    flex: 1,
                    height: 48,
                    paddingHorizontal: spacing[4],
                    borderRadius: radius.md,
                    backgroundColor: t.bgInput,
                    borderWidth: 1.5,
                    borderColor: t.border,
                    fontSize: fontSize.base,
                    color: t.textPrimary,
                  }}
                />
              </View>
              <Button title="Enviar código" onPress={sendOtp} loading={loading} full size="lg" />
            </View>
          ) : null}

          {step === "code" ? (
            <View style={{ gap: spacing[3] }}>
              <Text style={{ fontSize: fontSize.sm, color: t.textSecondary, fontWeight: "500" }}>
                Código de 6 dígitos
              </Text>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
                placeholder="______"
                placeholderTextColor={t.textTertiary}
                keyboardType="number-pad"
                maxLength={6}
                style={{
                  height: 64,
                  borderRadius: radius.md,
                  backgroundColor: t.bgInput,
                  borderWidth: 1.5,
                  borderColor: t.border,
                  fontSize: 28,
                  fontWeight: "700",
                  letterSpacing: 12,
                  textAlign: "center",
                  color: t.textPrimary,
                }}
              />
              <Button
                title="Verificar"
                onPress={() => confirmOtp(false)}
                loading={loading}
                full
                size="lg"
              />
              <Pressable onPress={countdown === 0 ? sendOtp : undefined} style={{ padding: spacing[2] }}>
                <Text
                  style={{
                    textAlign: "center",
                    color: countdown === 0 ? t.primary : t.textTertiary,
                    fontSize: fontSize.sm,
                    fontWeight: "500",
                  }}
                >
                  {countdown === 0
                    ? "Reenviar código"
                    : `Reenviar en ${String(Math.floor(countdown / 60)).padStart(1, "0")}:${String(countdown % 60).padStart(2, "0")}`}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {step === "register" ? (
            <View style={{ gap: spacing[3] }}>
              <View>
                <Text style={{ fontSize: fontSize.sm, color: t.textSecondary, marginBottom: 6, fontWeight: "500" }}>
                  Nombre completo
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Ej. María Rodríguez"
                  placeholderTextColor={t.textTertiary}
                  style={{
                    height: 48,
                    paddingHorizontal: spacing[4],
                    borderRadius: radius.md,
                    backgroundColor: t.bgInput,
                    borderWidth: 1.5,
                    borderColor: t.border,
                    fontSize: fontSize.base,
                    color: t.textPrimary,
                  }}
                />
              </View>
              <View>
                <Text style={{ fontSize: fontSize.sm, color: t.textSecondary, marginBottom: 6, fontWeight: "500" }}>
                  Soy...
                </Text>
                <View style={{ flexDirection: "row", gap: spacing[2] }}>
                  {(["BUYER", "PRODUCER"] as const).map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => setRole(r)}
                      style={{
                        flex: 1,
                        padding: spacing[3],
                        borderRadius: radius.md,
                        borderWidth: 1.5,
                        borderColor: role === r ? t.primary : t.border,
                        backgroundColor: role === r ? t.primaryLight : t.bgPrimary,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>{r === "BUYER" ? "🛍️" : "👨‍🌾"}</Text>
                      <Text
                        style={{
                          fontSize: fontSize.sm,
                          fontWeight: "600",
                          color: role === r ? t.primary : t.textSecondary,
                          marginTop: 4,
                        }}
                      >
                        {r === "BUYER" ? "Comprador" : "Productor"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Button
                title="Crear cuenta y entrar"
                onPress={() => confirmOtp(true)}
                loading={loading}
                full
                size="lg"
                disabled={name.length < 2}
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
