import React from "react";
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from "react-native-svg";

// Ilustraciones de la cosecha para el cuadro del inicio. Todas comparten el
// mismo lienzo (160×160, apoyadas en el suelo en y≈150) y el mismo trazo, para
// que en el carrusel se vean como una sola familia.

const INK = "#3A2616";
const SW = 3;
const line = { stroke: INK, strokeWidth: SW, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function Shine({ cx, cy, rx, ry, rotate = -25 }: { cx: number; cy: number; rx: number; ry: number; rotate?: number }) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#FFFFFF" opacity={0.35} transform={`rotate(${rotate} ${cx} ${cy})`} />;
}

/** Etiqueta de costal con hoja y nombre. */
function SackLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <G>
      <Rect x={x - 24} y={y} width={48} height={30} rx={6} fill="#F4E6C8" {...line} strokeWidth={2} />
      <Path d={`M${x - 4} ${y + 12} C${x - 4} ${y + 5} ${x + 4} ${y + 3} ${x + 8} ${y + 4} C${x + 8} ${y + 10} ${x + 2} ${y + 14} ${x - 4} ${y + 12} Z`} fill="#4F9A3A" />
      <SvgText x={x} y={y + 25} fontSize={9} fontWeight="800" fill="#5B3A1E" textAnchor="middle" letterSpacing={0.8}>
        {text}
      </SvgText>
    </G>
  );
}

function Potato({ cx, cy, rx, ry, rotate = 0 }: { cx: number; cy: number; rx: number; ry: number; rotate?: number }) {
  return (
    <G transform={`rotate(${rotate} ${cx} ${cy})`}>
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#C99A5B" {...line} />
      <Ellipse cx={cx + rx * 0.25} cy={cy + ry * 0.3} rx={rx * 0.55} ry={ry * 0.45} fill="#B5844A" />
      <Circle cx={cx - rx * 0.35} cy={cy - ry * 0.2} r={1.6} fill="#7E5630" />
      <Circle cx={cx + rx * 0.3} cy={cy - ry * 0.35} r={1.4} fill="#7E5630" />
      <Shine cx={cx - rx * 0.35} cy={cy - ry * 0.45} rx={rx * 0.35} ry={ry * 0.2} />
    </G>
  );
}

export function PapaArt() {
  return (
    <Svg viewBox="0 0 160 160" width="100%" height="100%">
      <Path d="M44 64 C34 92 32 120 38 146 C62 154 98 154 122 146 C128 120 126 92 116 64 Z" fill="#D8B07A" {...line} />
      <Path d="M106 66 C114 94 116 122 112 149 C116 148 119 147 122 146 C128 120 126 92 116 64 Z" fill="#BF925C" />
      <Path d="M44 100 Q60 96 74 100 M90 132 Q104 128 118 132 M46 134 Q54 131 62 134" stroke="#B88A55" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Ellipse cx={80} cy={64} rx={37} ry={9} fill="#7C552C" {...line} />
      <Potato cx={64} cy={56} rx={14} ry={11} rotate={-12} />
      <Potato cx={100} cy={58} rx={13} ry={10} rotate={14} />
      <Potato cx={83} cy={50} rx={15} ry={12} />
      <Path d="M44 74 Q80 84 116 74" stroke="#7A4E25" strokeWidth={5} fill="none" strokeLinecap="round" />
      <Circle cx={80} cy={80} r={4.5} fill="#7A4E25" {...line} strokeWidth={2} />
      <SackLabel x={80} y={98} text="PAPA" />
      <Potato cx={24} cy={144} rx={13} ry={9} rotate={-8} />
      <Potato cx={138} cy={146} rx={11} ry={8} rotate={10} />
    </Svg>
  );
}

const AVO = "M0 -22 C9 -22 13 -9 15 3 C18 16 10 24 0 24 C-10 24 -18 16 -15 3 C-13 -9 -9 -22 0 -22 Z";

function Avocado({ x, y, r, s = 1 }: { x: number; y: number; r: number; s?: number }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <Path d={AVO} fill="#46702A" {...line} />
      <Path d="M6 -16 C11 -8 13 6 9 16 C14 12 15 4 14 -2 C12 -10 10 -16 6 -16 Z" fill="#36581F" />
      <Ellipse cx={-6} cy={-6} rx={4} ry={8} fill="#FFFFFF" opacity={0.3} />
    </G>
  );
}

export function AguacateArt() {
  return (
    <Svg viewBox="0 0 160 160" width="100%" height="100%">
      <Path d="M40 74 Q80 8 120 74" stroke={INK} strokeWidth={10} fill="none" strokeLinecap="round" />
      <Path d="M40 74 Q80 8 120 74" stroke="#A86F35" strokeWidth={5} fill="none" strokeLinecap="round" />
      <Avocado x={56} y={70} r={-22} />
      <Avocado x={104} y={70} r={22} />
      <Avocado x={80} y={62} r={4} s={1.08} />
      <Path d="M30 76 L130 76 L118 146 Q80 153 42 146 Z" fill="#C98B48" {...line} />
      <Path d="M48 80 L54 146 M66 80 L68 149 M84 80 L83 150 M102 80 L98 149 M118 80 L110 147" stroke="#A86F35" strokeWidth={2.5} />
      <Path d="M34 100 L126 100 M37 124 L122 124" stroke="#A86F35" strokeWidth={4} />
      <Rect x={22} y={68} width={116} height={13} rx={6.5} fill="#A86F35" {...line} />
      <G transform="translate(134 130) rotate(18)">
        <Path d={AVO} fill="#36581F" {...line} />
        <Path d={AVO} fill="#DCE69A" transform="scale(0.78)" />
        <Path d={AVO} fill="#F1F3B8" transform="translate(0 -3) scale(0.5)" />
        <Circle cx={0} cy={6} r={8} fill="#8B5A2B" {...line} strokeWidth={2} />
        <Circle cx={-2.5} cy={3.5} r={2.2} fill="#FFFFFF" opacity={0.45} />
      </G>
    </Svg>
  );
}

/** Mazorca con granos y hojas, centrada en el origen. */
function Cob({ x, y, r }: { x: number; y: number; r: number }) {
  const kernels: React.ReactElement[] = [];
  for (let ky = -40; ky <= 34; ky += 8) {
    const half = ky < -30 || ky > 26 ? 1 : 2;
    for (let k = -half; k <= half; k++) {
      kernels.push(<Rect key={`${ky}:${k}`} x={k * 6.4 - 2.8} y={ky - 3} width={5.6} height={6.4} rx={2.2} fill="#FFD95E" />);
    }
  }
  return (
    <G transform={`translate(${x} ${y}) rotate(${r})`}>
      <Path d="M0 -50 C11 -50 16 -30 16 0 C16 28 10 44 0 46 C-10 44 -16 28 -16 0 C-16 -30 -11 -50 0 -50 Z" fill="#F2B530" {...line} />
      {kernels}
      <Path d="M2 46 C-22 38 -32 4 -26 -22 C-16 4 -8 24 2 46 Z" fill="#7BB04A" {...line} />
      <Path d="M-2 46 C22 38 30 8 24 -16 C14 8 6 26 -2 46 Z" fill="#5E9236" {...line} />
      <Path d="M0 46 C-2 52 -1 56 2 60" stroke="#8A6A2E" strokeWidth={4} fill="none" strokeLinecap="round" />
    </G>
  );
}

export function MaizArt() {
  return (
    <Svg viewBox="0 0 160 160" width="100%" height="100%">
      <Cob x={62} y={86} r={-20} />
      <Cob x={100} y={88} r={18} />
      {[
        [34, 146],
        [44, 150],
        [122, 148],
        [130, 143],
      ].map(([cx, cy]) => (
        <Rect key={cx} x={cx - 3} y={cy - 3.5} width={6} height={7} rx={2.4} fill="#FFD95E" {...line} strokeWidth={1.6} />
      ))}
    </Svg>
  );
}

const BERRY = "M0 18 C-13 9 -18 -4 -14 -11 C-9 -17 9 -17 14 -11 C18 -4 13 9 0 18 Z";

function Berry({ x, y, r = 0, s = 1 }: { x: number; y: number; r?: number; s?: number }) {
  const seeds = [
    [-7, -6],
    [0, -8],
    [7, -6],
    [-5, 1],
    [4, 1],
    [0, 8],
    [-9, -1],
    [9, -1],
  ];
  return (
    <G transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <Path d={BERRY} fill="#E2393F" {...line} />
      <Path d="M8 -12 C14 -6 12 6 2 15 C10 10 15 1 14 -8 Z" fill="#B82A30" />
      {seeds.map(([sx, sy]) => (
        <Ellipse key={`${sx}${sy}`} cx={sx} cy={sy} rx={1.1} ry={1.7} fill="#FFE27A" />
      ))}
      <Path d="M0 -12 L-11 -18 L-4 -14 L-6 -22 L0 -15 L6 -22 L4 -14 L11 -18 Z" fill="#4F9A3A" {...line} strokeWidth={2} />
      <Ellipse cx={-6} cy={-7} rx={2.5} ry={4} fill="#FFFFFF" opacity={0.35} />
    </G>
  );
}

export function FresaArt() {
  return (
    <Svg viewBox="0 0 160 160" width="100%" height="100%">
      <Berry x={52} y={86} r={-18} />
      <Berry x={78} y={78} />
      <Berry x={104} y={84} r={16} />
      <Berry x={66} y={98} r={-6} s={1.05} />
      <Berry x={92} y={98} r={10} s={1.05} />
      <Path d="M30 100 L130 100 L120 146 L40 146 Z" fill="#E9D3A6" {...line} />
      <Path d="M58 100 L60 146 M80 100 L80 146 M102 100 L100 146" stroke="#C9AE7A" strokeWidth={2.5} />
      <Rect x={26} y={96} width={108} height={11} rx={4} fill="#D6B97E" {...line} />
      <Berry x={140} y={136} r={30} s={0.85} />
      <Berry x={20} y={138} r={-30} s={0.8} />
    </Svg>
  );
}

function Radish({ x, y, r = 0 }: { x: number; y: number; r?: number }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${r})`}>
      <Path d="M0 18 C1 24 0 30 -2 34" stroke="#EFE3E6" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <Circle cx={0} cy={0} r={19} fill="#D7336B" {...line} />
      <Path d="M-14 8 C-8 18 8 18 14 8 C10 20 -10 20 -14 8 Z" fill="#F4E4EA" />
      <Path d="M8 -15 C17 -8 18 4 12 12 C20 4 20 -10 8 -15 Z" fill="#B0244F" />
      <Ellipse cx={-7} cy={-7} rx={4} ry={6} fill="#FFFFFF" opacity={0.35} transform="rotate(-30 -7 -7)" />
    </G>
  );
}

export function RabanoArt() {
  return (
    <Svg viewBox="0 0 160 160" width="100%" height="100%">
      {[
        "M80 96 C60 70 44 50 40 22 C56 30 70 52 80 96 Z",
        "M80 96 C100 70 116 50 120 22 C104 30 90 52 80 96 Z",
        "M80 96 C72 66 70 40 80 12 C90 40 88 66 80 96 Z",
        "M80 96 C62 82 40 76 26 60 C46 58 64 70 80 96 Z",
        "M80 96 C98 82 120 76 134 60 C114 58 96 70 80 96 Z",
      ].map((d, i) => (
        <Path key={d} d={d} fill={i % 2 ? "#4F8F32" : "#62A63E"} {...line} />
      ))}
      <Radish x={58} y={118} r={-14} />
      <Radish x={102} y={116} r={14} />
      <Radish x={80} y={126} />
      <Rect x={70} y={90} width={20} height={9} rx={3} fill="#E8B54A" {...line} strokeWidth={2} />
    </Svg>
  );
}

function Bean({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${r})`}>
      <Ellipse cx={0} cy={0} rx={6} ry={4.4} fill="#6B3B20" stroke={INK} strokeWidth={1.6} />
      <Path d="M-4.5 0 Q0 -1.8 4.5 0" stroke="#3A1E10" strokeWidth={1.3} fill="none" />
    </G>
  );
}

export function CafeArt() {
  const beans = [
    [62, 60, 20],
    [74, 54, -30],
    [88, 53, 40],
    [100, 60, -10],
    [68, 66, -60],
    [82, 62, 10],
    [95, 66, 70],
    [80, 47, -5],
  ];
  return (
    <Svg viewBox="0 0 160 160" width="100%" height="100%">
      <Path d="M42 66 C34 94 32 122 38 146 C62 154 98 154 122 146 C128 122 126 94 118 66 Z" fill="#CFA571" {...line} />
      <Path d="M108 68 C116 96 118 122 113 149 C117 148 120 147 122 146 C128 122 126 94 118 66 Z" fill="#B48A55" />
      <Path d="M36 66 C36 56 124 56 124 66 C124 76 36 76 36 66 Z" fill="#B98D58" {...line} />
      <Ellipse cx={80} cy={64} rx={36} ry={10} fill="#4A2814" />
      <Path d="M48 64 C56 44 104 44 112 64 Z" fill="#5A311B" {...line} />
      {beans.map(([x, y, r]) => (
        <Bean key={`${x}${y}`} x={x} y={y} r={r} />
      ))}
      <SackLabel x={80} y={96} text="CAFÉ" />
      <G>
        <Path d="M14 150 C24 138 34 132 48 128" stroke="#6B4A2A" strokeWidth={3.5} fill="none" strokeLinecap="round" />
        <Path d="M22 140 C10 136 6 124 10 116 C20 120 26 130 22 140 Z" fill="#3F7F35" {...line} strokeWidth={2} />
        <Path d="M40 130 C40 118 50 110 60 110 C58 122 50 130 40 130 Z" fill="#4F9A3A" {...line} strokeWidth={2} />
        {[
          [30, 134],
          [36, 140],
          [28, 143],
        ].map(([cx, cy]) => (
          <G key={`${cx}${cy}`}>
            <Circle cx={cx} cy={cy} r={5.5} fill="#C7282F" {...line} strokeWidth={1.8} />
            <Circle cx={cx - 1.6} cy={cy - 1.8} r={1.6} fill="#FFFFFF" opacity={0.5} />
          </G>
        ))}
      </G>
      <Bean x={134} y={148} r={20} />
      <Bean x={146} y={145} r={-30} />
    </Svg>
  );
}

/** Un plátano con la base en el origen y la punta hacia arriba a la derecha. */
const BANANA = "M0 0 C22 -2 46 -20 58 -52 C60 -57 66 -56 65 -50 C58 -14 32 10 0 9 Z";

export function PlatanoArt() {
  const fingers = [-34, -16, 2, 20];
  return (
    <Svg viewBox="0 0 160 160" width="100%" height="100%">
      {fingers.map((r, i) => (
        <G key={r} transform={`translate(${48 + i * 3} ${128 - i * 2}) rotate(${r})`}>
          <Path d={BANANA} fill="#F6CF45" {...line} />
          <Path d="M4 6 C28 4 50 -14 61 -44 C56 -10 30 9 4 6 Z" fill="#E0AE2A" />
          <Path d="M6 -2 C22 -6 38 -18 48 -36" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M58 -52 C59 -57 65 -57 65 -50" stroke="#5B4022" strokeWidth={4.5} fill="none" strokeLinecap="round" />
        </G>
      ))}
      <Path d="M52 132 C44 136 36 140 26 140" stroke={INK} strokeWidth={12} fill="none" strokeLinecap="round" />
      <Path d="M52 132 C44 136 36 140 26 140" stroke="#8C9A3A" strokeWidth={7} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

/** Hoja de hierba (almendrada, con nervio) con la base en (x, y). */
function HerbLeaf({ x, y, r, c, s = 1 }: { x: number; y: number; r: number; c: string; s?: number }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <Path d="M0 0 C9 -7 10 -20 0 -30 C-10 -20 -9 -7 0 0 Z" fill={c} {...line} strokeWidth={2} />
      <Path d="M0 -3 L0 -24" stroke="#2F6B27" strokeWidth={1.4} strokeLinecap="round" />
    </G>
  );
}

export function HierbasArt() {
  // Cada tallo: curva desde el amarre y hojas a lo largo [x, y, giro].
  const stems: { d: string; leaves: [number, number, number][] }[] = [
    { d: "M80 118 C68 92 52 70 40 48", leaves: [[40, 48, -40], [50, 66, -70], [58, 78, -10]] },
    { d: "M80 118 C76 88 70 60 64 30", leaves: [[64, 30, -12], [68, 52, -55], [72, 70, 30]] },
    { d: "M80 118 C80 86 81 52 82 18", leaves: [[82, 18, 2], [81, 44, -40], [81, 60, 40]] },
    { d: "M80 118 C84 88 92 60 98 30", leaves: [[98, 30, 14], [92, 52, 55], [88, 70, -30]] },
    { d: "M80 118 C92 92 108 70 120 48", leaves: [[120, 48, 40], [110, 66, 70], [102, 78, 10]] },
  ];
  const colors = ["#4E9E3E", "#3F8533", "#5BAE48"];
  return (
    <Svg viewBox="0 0 160 160" width="100%" height="100%">
      {stems.map((st) => (
        <Path key={st.d} d={st.d} stroke="#7FB55A" strokeWidth={3.5} fill="none" strokeLinecap="round" />
      ))}
      {stems.flatMap((st, i) =>
        st.leaves.map(([x, y, r], j) => <HerbLeaf key={`${i}-${j}`} x={x} y={y} r={r} c={colors[(i + j) % 3]} s={j === 0 ? 1.15 : 0.9} />)
      )}
      <Path d="M80 120 L68 150 M80 120 L76 151 M80 120 L86 151 M80 120 L94 150" stroke="#7FB55A" strokeWidth={3.5} strokeLinecap="round" />
      <Rect x={68} y={112} width={24} height={12} rx={4} fill="#E6A93A" {...line} strokeWidth={2} />
      <Path d="M80 124 C74 132 70 134 64 134 M80 124 C86 132 90 134 96 134" stroke="#E6A93A" strokeWidth={3} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
