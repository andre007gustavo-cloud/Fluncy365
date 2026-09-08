export const MONTHLY_SHIELDS = 2;

export interface Streak {
  readonly current: number;
  readonly best: number;
  readonly shieldsLeft: number;
  /** Ultimo dia estudado, YYYY-MM-DD no fuso do aluno. */
  readonly lastDay: string | null;
}
