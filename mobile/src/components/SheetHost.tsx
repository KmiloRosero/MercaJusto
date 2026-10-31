import React from "react";
import { View } from "react-native";
import { create } from "zustand";

interface SheetPortal {
  nodes: Record<string, React.ReactNode>;
  set: (id: string, node: React.ReactNode) => void;
  remove: (id: string) => void;
}

/**
 * Las hojas inferiores se dibujan aquí, en la ventana principal, y no en un
 * Modal: en Android el Modal es otra ventana y de borde a borde no se entera
 * del teclado, que tapaba los campos. En la ventana principal la hoja sí
 * puede subir con el teclado.
 */
export const useSheetPortal = create<SheetPortal>((setState) => ({
  nodes: {},
  set: (id, node) => setState((s) => ({ nodes: { ...s.nodes, [id]: node } })),
  remove: (id) =>
    setState((s) => {
      const { [id]: _gone, ...rest } = s.nodes;
      return { nodes: rest };
    }),
}));

/** Va una vez en la raíz, encima de las pantallas y del dock. */
export function SheetHost() {
  const nodes = useSheetPortal((s) => s.nodes);
  const entries = Object.entries(nodes);
  if (entries.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
      {entries.map(([id, node]) => (
        <React.Fragment key={id}>{node}</React.Fragment>
      ))}
    </View>
  );
}
