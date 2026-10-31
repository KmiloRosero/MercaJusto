import React, { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "../theme";
import { useRoadRoute } from "../lib/roadRoute";
import { MAP_HEIGHT, boundsPoints, pathPoints, type Coordinate, type MapPreviewProps } from "./mapTypes";

// Mapa real en la web: OpenStreetMap con Leaflet (en el celular, el mismo mapa
// va dentro de un WebView). La línea sigue la carretera (OSRM) y el repartidor aparece en
// vivo como un marcador que se mueve.

// Leaflet usa `window` al cargarse: solo se carga en el navegador, no en el
// render del servidor.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const L: typeof Leaflet = typeof window !== "undefined" ? require("leaflet") : (null as unknown as typeof Leaflet);

const toLatLng = (c: Coordinate): Leaflet.LatLngTuple => [c.latitude, c.longitude];

/** Marcador redondo hecho con HTML (sin imágenes que descargar). */
function pin(color: string, label: string, opts: { size?: number; ring?: string; inner?: string } = {}) {
  const size = opts.size ?? 30;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid ${opts.ring ?? "#fff"};
      box-shadow:0 3px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;
      color:#fff;font:800 13px system-ui,sans-serif" aria-label="${label}">${opts.inner ?? ""}</div>`,
  });
}

const BIKE_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h2l3 7.5M5.5 17.5 9 10h6l3.5 7.5M9 10 7.5 6H5"/></svg>';
const LEAF_SVG =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M17 8C8 10 5.9 16.2 3.8 21.3l1.9.7.9-2.3c.5.2 1 .3 1.4.3C19 20 22 3 22 3c-1 2-8 2.3-13 3.3S2 11.5 2 13.5s1.8 3.8 1.8 3.8C7 8 17 8 17 8z"/></svg>';
const HOME_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M12 3 2 12h3v8h5v-5h4v5h5v-8h3z"/></svg>';

export default function MapPreview(props: MapPreviewProps) {
  const { origin, destination, route, courier, courierName, height = MAP_HEIGHT, highlightLabel = "Este pedido" } = props;
  const theme = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const courierRef = useRef<Leaflet.Marker | null>(null);
  const fittedKmRef = useRef<number | null | undefined>(undefined);

  const points = pathPoints(props);
  const road = useRoadRoute(points);
  const multiStop = !!route && route.length > 1;
  const hasPoints = points.length > 0;

  // Crear el mapa una vez.
  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;
    const map = L.map(hostRef.current, { zoomControl: false, scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    map.setView([1.2136, -77.2811], 10);
    return () => {
      map.remove();
      mapRef.current = null;
      courierRef.current = null;
    };
  }, [hasPoints]);

  // Ruta por carretera, finca y entregas.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (road.path.length > 1) {
      L.polyline(road.path.map(toLatLng), { color: "#ffffff", weight: 8, opacity: 0.9 }).addTo(layer);
      L.polyline(road.path.map(toLatLng), { color: theme.primary, weight: 5, opacity: 0.95, dashArray: road.km === null ? "8 8" : undefined }).addTo(layer);
    }
    if (origin) L.marker(toLatLng(origin), { icon: pin(theme.success, "Finca", { inner: LEAF_SVG }) }).bindTooltip("Finca del productor").addTo(layer);
    if (multiStop) {
      route!.forEach((s, i) => {
        L.marker(toLatLng(s), {
          icon: s.mine ? pin(theme.primary, highlightLabel, { inner: HOME_SVG, size: 34 }) : pin("#8F8F8F", `Parada ${i + 1}`, { inner: String(i + 1), size: 26 }),
        })
          .bindTooltip(s.mine ? `${highlightLabel} · parada ${i + 1}` : `Parada ${i + 1}`)
          .addTo(layer);
      });
    } else if (destination) {
      L.marker(toLatLng(destination), { icon: pin(theme.primary, "Entrega", { inner: HOME_SVG, size: 34 }) }).bindTooltip("Dirección de entrega").addTo(layer);
    }
    // Encuadra al cargar y cuando llega la ruta por carretera; no en cada movimiento del repartidor.
    if (fittedKmRef.current !== road.km) {
      const all = boundsPoints(props);
      if (all.length > 0) map.fitBounds(L.latLngBounds(all.map(toLatLng)), { padding: [36, 36], maxZoom: 15 });
      fittedKmRef.current = road.km;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [road, hasPoints, multiStop, theme.primary, theme.success, highlightLabel]);

  // Repartidor en vivo: el marcador se mueve sin redibujar el resto.
  const courierLat = courier?.latitude;
  const courierLng = courier?.longitude;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (courierLat == null || courierLng == null) {
      courierRef.current?.remove();
      courierRef.current = null;
      return;
    }
    if (!courierRef.current) {
      courierRef.current = L.marker([courierLat, courierLng], { icon: pin("#A8501C", "Repartidor", { inner: BIKE_SVG, size: 38 }), zIndexOffset: 1000 })
        .bindTooltip(courierName ? `${courierName} va en camino` : "Repartidor")
        .addTo(map);
    } else {
      courierRef.current.setLatLng([courierLat, courierLng]);
    }
  }, [courierLat, courierLng, courierName, hasPoints]);

  return (
    <View
      accessibilityLabel={courier ? "Mapa con la ruta y la ubicación en vivo del repartidor" : "Mapa con la ruta del pedido"}
      style={{ width: "100%", height, backgroundColor: theme.bgSecondary, overflow: "hidden" }}
    >
      {hasPoints ? (
        <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Sin coordenadas disponibles para este pedido</Text>
        </View>
      )}
    </View>
  );
}
