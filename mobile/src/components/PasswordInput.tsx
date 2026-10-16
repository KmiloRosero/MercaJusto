import React, { useState } from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";
import { Icon } from "./Icon";
import { fontSize, radius, spacing, useTheme } from "../theme";

type Props = Omit<TextInputProps, "secureTextEntry" | "style"> & {
  /** "new" para crear una contraseña (el teclado ofrece generarla), "current" para escribir la que ya existe. */
  kind: "new" | "current";
};

/** Campo de contraseña con botón para mostrarla mientras se escribe. */
export function PasswordInput({ kind, ...props }: Props) {
  const t = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ justifyContent: "center" }}>
      <TextInput
        placeholderTextColor={t.textTertiary}
        {...props}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={kind === "new" ? "new-password" : "current-password"}
        textContentType={kind === "new" ? "newPassword" : "password"}
        style={{
          height: 48,
          paddingLeft: spacing[4],
          paddingRight: 52,
          borderRadius: radius.md,
          backgroundColor: t.bgInput,
          borderWidth: 1.5,
          borderColor: t.border,
          fontSize: fontSize.base,
          color: t.textPrimary,
        }}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        hitSlop={8}
        style={{ position: "absolute", right: 0, width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
      >
        <Icon name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={t.textSecondary} />
      </Pressable>
    </View>
  );
}
