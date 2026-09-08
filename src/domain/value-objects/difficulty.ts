/** Dificuldade estimada de um exercicio, de 1 (trivial) a 10 (muito dificil). */
export type Difficulty = number;

export const DIFFICULTY_MIN: Difficulty = 1;
export const DIFFICULTY_MAX: Difficulty = 10;

export function clampDifficulty(value: number): Difficulty {
  if (Number.isNaN(value)) return DIFFICULTY_MIN;
  return Math.min(DIFFICULTY_MAX, Math.max(DIFFICULTY_MIN, Math.round(value)));
}
