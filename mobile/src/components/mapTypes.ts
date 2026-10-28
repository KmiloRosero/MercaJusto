export type Coordinate = { latitude: number; longitude: number };

/** Parada de la ruta del repartidor, en orden de entrega. */
export type RouteStop = Coordinate & { mine: boolean };

export interface MapPreviewProps {
  /** Finca de donde sale el pedido. */
  origin: Coordinate | null;
  /** Dirección de entrega de este pedido. */
  destination: Coordinate | null;
  /**
   * Paradas de la ruta optimizada (VRP), en orden. Si llega, la línea pasa por
   * todas; si no, une la finca con la entrega.
   */
  route?: RouteStop[];
  /** Etiqueta de la parada resaltada: "Este pedido" (seguimiento) o "Siguiente" (repartidor). */
  highlightLabel?: string;
  /** Dónde va el repartidor ahora (seguimiento en vivo). */
  courier?: Coordinate | null;
  /** Nombre del repartidor para su marcador. */
  courierName?: string;
  /** Alto del mapa; por defecto MAP_HEIGHT. */
  height?: number;
}

export const MAP_HEIGHT = 240;

/** Todos los puntos que el mapa debe encuadrar: la ruta y el repartidor. */
export function boundsPoints(props: MapPreviewProps): Coordinate[] {
  return [...pathPoints(props), ...(props.courier ? [props.courier] : [])];
}

/** Puntos de la línea: finca → paradas de la ruta (o la entrega). */
export function pathPoints({ origin, destination, route }: MapPreviewProps): Coordinate[] {
  const stops: Coordinate[] = route && route.length > 0 ? route : destination ? [destination] : [];
  return [origin, ...stops].filter((c): c is Coordinate => c !== null);
}
