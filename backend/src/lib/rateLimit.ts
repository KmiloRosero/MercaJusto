import { HttpError } from "../middleware/errorHandler";

/**
 * Límite de peticiones en memoria por clave (teléfono, IP...). Basta para un
 * solo servidor; cada SMS cuesta dinero, así que el envío de códigos lo usa.
 */
export function createRateLimiter(rules: { max: number; windowMs: number; message: string }[]) {
  const hits = new Map<string, number[]>();
  const longest = Math.max(...rules.map((r) => r.windowMs));

  return function check(key: string) {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < longest);
    for (const rule of rules) {
      if (recent.filter((t) => now - t < rule.windowMs).length >= rule.max) {
        hits.set(key, recent);
        throw new HttpError(429, rule.message);
      }
    }
    recent.push(now);
    hits.set(key, recent);
  };
}
