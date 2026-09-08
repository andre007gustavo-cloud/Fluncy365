import type { ReviewQuality, SrsCard } from "../entities/srs-card";

/**
 * Contrato do agendador de repeticao espacada (secoes 8.4 e 13).
 * A implementacao SM-2 adaptada entra na Fase 1 - aqui fica so a interface,
 * para que casos de uso ja possam depender dela.
 */
export interface SrsScheduler {
  /** Aplica a resposta do aluno e devolve o cartao reagendado. */
  review(card: SrsCard, quality: ReviewQuality, today: Date): SrsCard;
  /** Seleciona o que revisar hoje, respeitando o teto da sessao. */
  dueCards(cards: readonly SrsCard[], today: Date, limit: number): readonly SrsCard[];
}

/** Teto de revisoes na sessao core; o excedente vai para a fila opcional. */
export const DAILY_REVIEW_LIMIT = 20;
