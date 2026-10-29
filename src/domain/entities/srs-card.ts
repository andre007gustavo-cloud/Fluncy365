export type SrsItemType = "word" | "phrase" | "structure";

/** Qualidade da resposta no SM-2: 0 = branco total, 5 = perfeito e imediato. */
export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

export const SRS_MIN_EASE = 1.3;

export interface SrsCard {
  readonly id: string;
  readonly front: string;
  readonly back: string;
  readonly type: SrsItemType;
  /** Fator de facilidade do SM-2. Nunca abaixo de SRS_MIN_EASE. */
  readonly ease: number;
  readonly intervalDays: number;
  readonly dueAt: Date;
  readonly lapses: number;
  readonly sourceLessonId: string | null;
}

export const SRS_INITIAL_EASE = 2.5;

export interface NewSrsCardInput {
  readonly id: string;
  readonly front: string;
  readonly back: string;
  readonly type: SrsItemType;
  readonly sourceLessonId?: string | null;
}

/** Cartao novo: ainda sem historico e ja vencido, para entrar na proxima sessao. */
export function createSrsCard(input: NewSrsCardInput, now: Date): SrsCard {
  return {
    id: input.id,
    front: input.front,
    back: input.back,
    type: input.type,
    ease: SRS_INITIAL_EASE,
    intervalDays: 0,
    dueAt: new Date(now.getTime()),
    lapses: 0,
    sourceLessonId: input.sourceLessonId ?? null,
  };
}

/** Um cartao esta vencido quando sua data de revisao ja passou (inclusive agora). */
export function isDue(card: SrsCard, now: Date): boolean {
  return card.dueAt.getTime() <= now.getTime();
}

/** Cartao "maduro": intervalo >= 21 dias. Alimenta o XP de evolucao (secao 10.1). */
export function isMature(card: SrsCard): boolean {
  return card.intervalDays >= 21;
}
