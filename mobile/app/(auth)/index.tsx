import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../../src/store/auth";

// Índice del grupo (auth) — redirige a onboarding si no hay sesión,
// o a tabs si ya la hay.
export default function AuthIndex() {
  const user = useAuth((s) => s.user);
  return <Redirect href={user ? "/(tabs)/home" : "/(auth)/onboarding"} />;
}
