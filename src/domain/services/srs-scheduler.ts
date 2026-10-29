import { selectDueCards } from "./select-due-cards";
import { SRS_MIN_EASE, type ReviewQuality, type SrsCard } from "../entities/srs-card";

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

/** SM-2 original: ease + (0,1 - (5-q) * (0,08 + (5-q) * 0,02)), com piso e 2 casas decimais. */
export function nextEase(ease: number, quality: ReviewQuality): number {
  const miss = 5 - quality;
  const raw = ease + (0.1 - miss * (0.08 + miss * 0.02));
  return Math.round(Math.max(SRS_MIN_EASE, raw) * 100) / 100;
}

/**
 * Proximo intervalo (dias) apos um acerto (qualidade >= 3): escada fixa 1/3/7
 * e depois intervalo x ease. O `ease` recebido ja deve ser o atualizado.
 */
export function nextInterval(intervalDays: number, ease: number): number {
  if (intervalDays < 1) return 1;
  if (intervalDays < 3) return 3;
  if (intervalDays < 7) return 7;
  return Math.round(intervalDays * ease);
}

const MS_PER_DAY = 86_400_000;
const FIRST_PASSING_QUALITY = 3;
const LAPSE_INTERVAL_DAYS = 1;

/**
 * SM-2 adaptado. O vencimento e calculado a partir do instante da revisao
 * (UTC, sem fuso) e o intervalo vem do que esta guardado no cartao, nao do
 * atraso real da revisao.
 */
export class Sm2SrsScheduler implements SrsScheduler {
  review(card: SrsCard, quality: ReviewQuality, today: Date): SrsCard {
    const ease = nextEase(card.ease, quality);
    const lapsed = quality < FIRST_PASSING_QUALITY;
    const intervalDays = lapsed ? LAPSE_INTERVAL_DAYS : nextInterval(card.intervalDays, ease);

    return {
      ...card,
      ease,
      intervalDays,
      lapses: lapsed ? card.lapses + 1 : card.lapses,
      dueAt: new Date(today.getTime() + intervalDays * MS_PER_DAY),
    };
  }

  dueCards(cards: readonly SrsCard[], today: Date, limit: number): readonly SrsCard[] {
    return selectDueCards(cards, today, limit).selected;
  }
}
