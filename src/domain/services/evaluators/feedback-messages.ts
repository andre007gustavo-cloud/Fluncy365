/** Textos pt-BR fixos dos avaliadores deterministicos (D9). */
export const FEEDBACK_MESSAGES = {
  correct: "Muito bem! Resposta correta.",
  correctWithSpelling: (expected: string) => `Quase perfeito! A grafia certa é "${expected}".`,
  wrongAnswer: (expected: string) => `Não foi dessa vez. A resposta correta é "${expected}".`,
  emptyAnswer: "Você não respondeu. Tente de novo!",
  wrongOption: (expected: string) => `A opção correta é "${expected}".`,
  wrongTruth: (expected: boolean) =>
    expected ? "A afirmação era verdadeira." : "A afirmação era falsa.",
  dictationMissingWord: (word: string) => `Faltou a palavra "${word}".`,
  dictationExtraWord: (word: string) => `A palavra "${word}" não estava no áudio.`,
  dictationWrongWord: (expected: string) => `Aqui o certo era "${expected}".`,
  reorderWrongOrder: (expected: string) => `A ordem correta é: ${expected}.`,
  matchWrongPair: (left: string, right: string) => `"${left}" combina com "${right}".`,
} as const;
