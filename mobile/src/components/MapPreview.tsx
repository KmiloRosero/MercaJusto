import React, { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useTheme } from "../theme";
import { useRoadRoute } from "../lib/roadRoute";
import { MAP_HEIGHT, boundsPoints, pathPoints, type Coordinate, type MapPreviewProps } from "./mapTypes";

// Mapa real en el celular: el mismo OpenStreetMap con Leaflet de la web, dentro
// de un WebView. Así no hace falta llave de Google Maps (sin ella, el mapa
// nativo de Android cierra la app). La línea sigue la carretera (OSRM) y el
// repartidor aparece en vivo como un marcador que se mueve.

// Las tejas de OpenStreetMap piden un Referer: la página carga con la web de la app como base.
const BASE_URL = "https://mercajusto.vercel.app/";

const toPair = (c: Coordinate) => [c.latitude, c.longitude];

function mapHtml(background: string) {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#m{margin:0;padding:0;height:100%;background:${background}}.leaflet-control-attribution{font-size:9px}</style>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head><body><div id="m"></div><script>
var map = L.map('m', { zoomControl: false }).setView([1.2136, -77.2811], 10);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
L.control.zoom({ position: 'bottomright' }).addTo(map);
var layer = L.layerGroup().addTo(map);
var courier = null;
var BIKE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h2l3 7.5M5.5 17.5 9 10h6l3.5 7.5M9 10 7.5 6H5"/></svg>';
var LEAF = '<svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M17 8C8 10 5.9 16.2 3.8 21.3l1.9.7.9-2.3c.5.2 1 .3 1.4.3C19 20 22 3 22 3c-1 2-8 2.3-13 3.3S2 11.5 2 13.5s1.8 3.8 1.8 3.8C7 8 17 8 17 8z"/></svg>';
var HOME = '<svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M12 3 2 12h3v8h5v-5h4v5h5v-8h3z"/></svg>';
function pin(color, inner, size) {
  size = size || 30;
  return L.divIcon({ className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    html: '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + color + ';border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;font:800 13px system-ui,sans-serif">' + (inner || '') + '</div>' });
}
window.render = function (d) {
  layer.clearLayers();
  if (d.path.length > 1) {
    L.polyline(d.path, { color: '#ffffff', weight: 8, opacity: 0.9 }).addTo(layer);
    L.polyline(d.path, { color: d.primary, weight: 5, opacity: 0.95, dashArray: d.dashed ? '8 8' : null }).addTo(layer);
  }
  if (d.origin) L.marker(d.origin, { icon: pin(d.success, LEAF) }).bindTooltip('Finca del productor').addTo(layer);
  d.stops.forEach(function (s) {
    L.marker(s.at, { icon: s.mine ? pin(d.primary, HOME, 34) : pin('#8F8F8F', String(s.n), 26) }).bindTooltip(s.label).addTo(layer);
  });
  if (d.courier) {
    if (!courier) courier = L.marker(d.courier, { icon: pin('#A8501C', BIKE, 38), zIndexOffset: 1000 }).bindTooltip(d.courierLabel).addTo(map);
    else courier.setLatLng(d.courier);
  } else if (courier) { courier.remove(); courier = null; }
  if (d.fit && d.bounds.length > 0) map.fitBounds(L.latLngBounds(d.bounds), { padding: [36, 36], maxZoom: 15 });
};
window.ReactNativeWebView.postMessage('ready');
</script></body></html>`;
}

export default function MapPreview(props: MapPreviewProps) {
  const { origin, destination, route, courier, courierName, highlightLabel = "Este pedido", height = MAP_HEIGHT } = props;
  const theme = useTheme();
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const fittedKm = useRef<number | null | undefined>(undefined);
  const points = pathPoints(props);
  const road = useRoadRoute(points);
  const multiStop = !!route && route.length > 1;
  // La página no cambia con los datos: solo se crea de nuevo si cambia el tema.
  const html = useMemo(() => mapHtml(theme.bgSecondary), [theme.bgSecondary]);

  useEffect(() => {
    if (!ready || points.length === 0) return;
    // Encuadra al cargar y cuando llega la ruta por carretera; no en cada movimiento del repartidor.
    const fit = fittedKm.current !== road.km;
    fittedKm.current = road.km;
    const stops = multiStop
      ? route!.map((s, i) => ({ at: toPair(s), mine: s.mine, n: i + 1, label: s.mine ? `${highlightLabel} · parada ${i + 1}` : `Parada ${i + 1}` }))
      : destination
        ? [{ at: toPair(destination), mine: true, n: 1, label: "Dirección de entrega" }]
        : [];
    const data = {
      path: road.path.map(toPair),
      dashed: road.km === null,
      origin: origin ? toPair(origin) : null,
      stops,
      courier: courier ? toPair(courier) : null,
      courierLabel: courierName ? `${courierName} va en camino` : "Repartidor",
      bounds: boundsPoints(props).map(toPair),
      fit,
      primary: theme.primary,
      success: theme.success,
    };
    webRef.current?.injectJavaScript(`window.render(${JSON.stringify(data)}); true;`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, road, courier?.latitude, courier?.longitude, courierName, multiStop, highlightLabel, theme.primary, theme.success]);

  if (points.length === 0) {
    return (
      <View style={{ width: "100%", height, alignItems: "center", justifyContent: "center", backgroundColor: theme.bgSecondary }}>
        <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Sin coordenadas disponibles para este pedido</Text>
      </View>
    );
  }

  const onMessage = (e: WebViewMessageEvent) => {
    if (e.nativeEvent.data === "ready") setReady(true);
  };

  return (
    <View
      accessibilityLabel={courier ? "Mapa con la ruta y la ubicación en vivo del repartidor" : "Mapa con la ruta del pedido"}
      style={{ width: "100%", height, backgroundColor: theme.bgSecondary, overflow: "hidden" }}
    >
      <WebView
        ref={webRef}
        key={html}
        source={{ html, baseUrl: BASE_URL }}
        originWhitelist={["*"]}
        onMessage={onMessage}
        onLoadStart={() => setReady(false)}
        javaScriptEnabled
        scrollEnabled={false}
        nestedScrollEnabled
        setSupportMultipleWindows={false}
        style={{ flex: 1, backgroundColor: theme.bgSecondary }}
      />
    </View>
  );
}
