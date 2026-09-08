/** Pontos de experiencia. Sempre inteiro e nunca negativo. */
export type Xp = number;

export function xp(value: number): Xp {
  return Math.max(0, Math.round(value));
}

export function addXp(current: Xp, delta: number): Xp {
  return xp(current + delta);
}
