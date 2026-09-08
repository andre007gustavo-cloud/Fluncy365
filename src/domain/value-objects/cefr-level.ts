/**
 * Nivel CEFR continuo: 1.0 = A1.0 ... 6.0 = C2.0 (secao 8.1 do planejamento).
 * Usar escala continua permite ao motor adaptativo mover o aluno em passos
 * pequenos (A2.3 -> A2.6) sem precisar "pular" uma faixa inteira.
 */
export type CefrLevel = number;

export const CEFR_MIN: CefrLevel = 1.0;
export const CEFR_MAX: CefrLevel = 6.0;

export const CEFR_BANDS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrBand = (typeof CEFR_BANDS)[number];

export function clampCefr(level: number): CefrLevel {
  if (Number.isNaN(level)) return CEFR_MIN;
  return Math.min(CEFR_MAX, Math.max(CEFR_MIN, level));
}

export function cefrBand(level: CefrLevel): CefrBand {
  const index = Math.min(CEFR_BANDS.length - 1, Math.max(0, Math.floor(clampCefr(level)) - 1));
  return CEFR_BANDS[index] ?? "A1";
}

/** Rotulo curto para a UI, ex.: 2.4 -> "A2.4". */
export function cefrLabel(level: CefrLevel): string {
  const clamped = clampCefr(level);
  const decimal = Math.round((clamped - Math.floor(clamped)) * 10);
  return `${cefrBand(clamped)}.${decimal}`;
}
