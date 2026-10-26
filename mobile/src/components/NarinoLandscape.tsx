import React from "react";
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Polygon, Rect, Stop } from "react-native-svg";

// Paisaje de Nariño dibujado en SVG (sin imagen: pesa casi nada y se ve nítido
// en cualquier pantalla). Amanecer andino, el volcán Galeras al fondo y las
// lomas con la "colcha de retazos" de cultivos que se ven desde Pasto.
// Las capas van separadas para moverlas con profundidad (efecto 3D).

const VB_W = 400;
const VB_H = 250;

/** Parcelas de cultivo de una loma: franjas inclinadas en los colores del campo. */
function Patchwork({ clipId, hill, fields, angle, hedge }: { clipId: string; hill: string; fields: string[]; angle: number; hedge: string }) {
  const stripe = 34;
  return (
    <G>
      <Defs>
        <ClipPath id={clipId}>
          <Path d={hill} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Path d={hill} fill={fields[0]} />
        <G transform={`rotate(${angle} 200 190)`}>
          {Array.from({ length: 20 }).map((_, i) => (
            <Rect key={i} x={-120 + i * stripe} y={60} width={stripe - 2} height={260} fill={fields[i % fields.length]} />
          ))}
          {/* Cercas vivas entre parcelas */}
          {Array.from({ length: 20 }).map((_, i) => (
            <Rect key={`h${i}`} x={-120 + i * stripe - 2} y={60} width={2} height={260} fill={hedge} opacity={0.55} />
          ))}
        </G>
        {/* Una línea de cerca que cruza la loma, como en las laderas de verdad */}
        <Path d={hill} fill="none" stroke={hedge} strokeWidth={1.5} opacity={0.6} />
      </G>
    </G>
  );
}

export type LandscapeLayer = "sky" | "far" | "mid" | "front";

/**
 * Una capa del paisaje. Se dibujan las cuatro apiladas y cada una se mueve un
 * poco distinto para dar profundidad. Todas comparten el mismo viewBox.
 */
export function NarinoLandscapeLayer({ layer }: { layer: LandscapeLayer }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice">
      {layer === "sky" ? (
        <>
          <Defs>
            <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#123A2F" />
              <Stop offset="0.45" stopColor="#2F6352" />
              <Stop offset="0.8" stopColor="#B9C98F" />
              <Stop offset="1" stopColor="#E8D79A" />
            </LinearGradient>
          </Defs>
          <Rect width={VB_W} height={VB_H} fill="url(#sky)" />
          {/* Sol de la mañana detrás de la cordillera */}
          <Circle cx={330} cy={128} r={30} fill="#F6E3A1" opacity={0.55} />
          <Circle cx={330} cy={128} r={16} fill="#FBEFC4" opacity={0.9} />
        </>
      ) : null}

      {layer === "far" ? (
        <>
          {/* Galeras: volcán de cumbre ancha, al fondo */}
          <Path d="M170 156 L244 100 Q256 92 268 100 L350 156 Z" fill="#4E7466" />
          <Path d="M244 100 Q256 92 268 100 L262 106 Q256 102 250 106 Z" fill="#6E9384" />
          {/* Cordillera lejana */}
          <Path d="M0 150 Q40 118 88 132 T190 128 T300 138 T400 126 L400 170 L0 170 Z" fill="#5F8A6C" />
        </>
      ) : null}

      {layer === "mid" ? (
        <Patchwork
          clipId="midHill"
          hill="M0 168 Q70 132 150 150 T290 146 T400 150 L400 250 L0 250 Z"
          fields={["#8DBA6A", "#C9B25C", "#6E9F4E", "#A98B45", "#9CC27A", "#5E8F45"]}
          angle={-18}
          hedge="#3E6B36"
        />
      ) : null}

      {layer === "front" ? (
        <>
          <Patchwork
            clipId="frontHill"
            hill="M0 200 Q110 176 210 192 T400 186 L400 250 L0 250 Z"
            fields={["#5E8F45", "#7FAE5B", "#B79C4E", "#4F7F3B", "#93BB6C"]}
            angle={14}
            hedge="#355E2E"
          />
          {/* Suelo donde se apoyan los productos */}
          <Polygon points={`0,232 ${VB_W},226 ${VB_W},${VB_H} 0,${VB_H}`} fill="#3E6B32" opacity={0.55} />
        </>
      ) : null}
    </Svg>
  );
}
