import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { sendCourierLocation } from "../api/client";
import type { Coordinate } from "../components/mapTypes";
import { haversineKm } from "./geo";

// Ubicación en vivo del repartidor. Mientras tiene entregas en camino, su
// celular envía el GPS cada 10 s (o al moverse 25 m) y el comprador lo ve
// moverse en el mapa. Solo con la app abierta: Expo Go no permite enviar la
// ubicación en segundo plano.

const SEND_EVERY_MS = 10_000;

export type ShareStatus = "off" | "asking" | "denied" | "sharing" | "simulating";

export function useShareLocation(enabled: boolean) {
  const [status, setStatus] = useState<ShareStatus>("asking");
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [simulating, setSimulating] = useState(false);
  const lastSent = useRef(0);

  const send = async (lat: number, lng: number, force = false) => {
    const now = Date.now();
    if (!force && now - lastSent.current < SEND_EVERY_MS) return;
    lastSent.current = now;
    try {
      await sendCourierLocation(lat, lng);
      setLastSentAt(now);
    } catch {
      // Sin señal: se intenta con la siguiente posición.
    }
  };

  // GPS real (se pausa mientras se simula el recorrido).
  useEffect(() => {
    if (!enabled || simulating) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (perm !== "granted") {
        setStatus("denied");
        return;
      }
      setStatus("sharing");
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: SEND_EVERY_MS, distanceInterval: 25 },
        (pos) => send(pos.coords.latitude, pos.coords.longitude)
      );
    })().catch(() => setStatus("denied"));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled, simulating]);

  /**
   * Recorrido simulado para la demo: el repartidor avanza por la ruta real
   * (por carretera) unos 400 m cada 2 s, como si fuera manejando.
   */
  const simulate = (path: Coordinate[]) => {
    if (path.length < 2) return;
    setSimulating(true);
    const stepKm = 0.4;
    // Puntos espaciados ~400 m a lo largo de la línea.
    const samples: Coordinate[] = [path[0]];
    let acc = 0;
    for (let i = 1; i < path.length; i++) {
      acc += haversineKm(path[i - 1], path[i]);
      if (acc >= stepKm) {
        samples.push(path[i]);
        acc = 0;
      }
    }
    samples.push(path[path.length - 1]);
    let i = 0;
    const tick = () => {
      if (i >= samples.length) {
        setSimulating(false);
        return;
      }
      const p = samples[i++];
      send(p.latitude, p.longitude, true);
      timer.current = setTimeout(tick, 2000);
    };
    tick();
  };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopSimulation = () => {
    if (timer.current) clearTimeout(timer.current);
    setSimulating(false);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const effective: ShareStatus = simulating ? "simulating" : !enabled ? "off" : status;
  return { status: effective, lastSentAt, simulate, stopSimulation, simulating };
}
