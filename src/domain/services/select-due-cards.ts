import { isDue, type SrsCard } from "../entities/srs-card";

export interface DueSelection {
  /** O que entra na sessao core de hoje, ja respeitando o teto. */
  readonly selected: readonly SrsCard[];
  /** Quantos cartoes vencidos sobraram para a fila de "revisao extra". */
  readonly overflow: number;
}

/**
 * Escolhe os cartoes vencidos da sessao. Ordem: o mais atrasado primeiro e,
 * em empate, o que o aluno mais errou (mais lapsos) - assim o teto diario
 * sempre protege o conteudo em risco, nao o que ja esta consolidado.
 */
export function selectDueCards(cards: readonly SrsCard[], now: Date, limit: number): DueSelection {
  const safeLimit = Math.max(0, Math.floor(limit));
  const due = cards.filter((card) => isDue(card, now));

  const ordered = [...due].sort((a, b) => {
    const byDueAt = a.dueAt.getTime() - b.dueAt.getTime();
    if (byDueAt !== 0) return byDueAt;
    const byLapses = b.lapses - a.lapses;
    if (byLapses !== 0) return byLapses;
    return a.id.localeCompare(b.id);
  });

  return {
    selected: ordered.slice(0, safeLimit),
    overflow: Math.max(0, ordered.length - safeLimit),
  };
}
