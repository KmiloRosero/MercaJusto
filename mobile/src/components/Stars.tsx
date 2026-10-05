import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "../theme";

interface StarsProps {
  rating: number;
  onChange?: (rating: number) => void;
  size?: number;
  readOnly?: boolean;
}

export function Stars({ rating, onChange, size = 40, readOnly = false }: StarsProps) {
  const t = useTheme();

  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 12 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= rating;
        return (
          <Pressable
            key={star}
            disabled={readOnly}
            onPress={() => onChange?.(star)}
            hitSlop={4}
            style={({ pressed }) => ({
              transform: [{ scale: pressed && !readOnly ? 1.2 : filled && !readOnly ? 1.1 : 1 }],
            })}
          >
            <Text
              style={{
                fontSize: size,
                color: filled ? t.warning : t.gray200,
                opacity: filled ? 1 : 0.5,
              }}
            >
              ★
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const FEEDBACK: Record<number, string> = {
  1: "😞 Muy malo",
  2: "😕 Malo",
  3: "😐 Aceptable",
  4: "😊 Bueno",
  5: "🤩 ¡Excelente!",
};

export function starFeedback(rating: number): string {
  return FEEDBACK[rating] || "";
}
