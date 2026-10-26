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
}

export const MAP_HEIGHT = 240;

/** Puntos de la línea: finca → paradas de la ruta (o la entrega). */
export function pathPoints({ origin, destination, route }: MapPreviewProps): Coordinate[] {
  const stops: Coordinate[] = route && route.length > 0 ? route : destination ? [destination] : [];
  return [origin, ...stops].filter((c): c is Coordinate => c !== null);
}
