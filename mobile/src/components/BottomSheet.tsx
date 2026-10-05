import React from "react";
import { Modal, Pressable, Text, View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { radius, spacing, useTheme, shadow } from "../theme";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  scrollable?: boolean;
}

export function BottomSheet({ visible, onClose, title, children, scrollable = true }: BottomSheetProps) {
  const t = useTheme();

  const content = (
    <View
      style={{
        backgroundColor: t.bgPrimary,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        paddingTop: spacing[3],
        paddingBottom: spacing[6],
        maxHeight: "85%",
      }}
    >
      <View
        style={{
          width: 40,
          height: 4,
          borderRadius: radius.full,
          backgroundColor: t.gray300,
          alignSelf: "center",
          marginBottom: spacing[4],
        }}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing[4],
          marginBottom: spacing[3],
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: "700", color: t.textPrimary }}>{title}</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={{ fontSize: 22, color: t.textTertiary }}>✕</Text>
        </Pressable>
      </View>
      {scrollable ? (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[4] }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ paddingHorizontal: spacing[4] }}>{children}</View>
      )}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
          onPress={onClose}
        />
        {content}
      </KeyboardAvoidingView>
    </Modal>
  );
}
