import { PixelRatio } from "react-native";

/**
 * Pide a Cloudinary la foto recortada al tamaño en que se muestra, en el
 * formato y calidad más livianos que soporte el celular: menos datos con mala
 * señal. Las URLs que no son de Cloudinary (fotos locales en desarrollo) no cambian.
 */
export function sizedImage(url: string, widthDp: number, aspect?: number): string {
  const marker = "/image/upload/";
  if (!url.includes("res.cloudinary.com") || !url.includes(marker)) return url;
  const px = Math.min(1600, Math.round(widthDp * PixelRatio.get()));
  const crop = aspect ? `c_fill,g_auto,ar_${Math.round(aspect * 100)}:100,` : "c_limit,";
  return url.replace(marker, `${marker}${crop}w_${px},q_auto,f_auto/`);
}
