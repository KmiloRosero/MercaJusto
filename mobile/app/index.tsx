import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../src/store/auth";

export default function RootIndex() {
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);

  if (!hydrated) return null;
  return <Redirect href={user ? "/(tabs)/home" : "/(auth)/onboarding"} />;
}
