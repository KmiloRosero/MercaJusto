import React from "react";
import { GlassBackdrop } from "./GlassAuth";
import type { SmokeyBackgroundProps } from "./smokey";

export type { SmokeyBackgroundProps } from "./smokey";

/**
 * Versión de celular del fondo de humo: el resplandor verde que respira
 * despacio. El shader WebGL vive en `SmokeyBackground.web.tsx`; en Android de
 * gama baja no se dibuja un shader a pantalla completa.
 */
export function SmokeyBackground(_props: SmokeyBackgroundProps) {
  return <GlassBackdrop />;
}

export default SmokeyBackground;
