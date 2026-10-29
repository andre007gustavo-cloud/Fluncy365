export interface NormalizeOptions {
  /** Padrao false: caixa e ignorada. */
  readonly caseSensitive?: boolean;
  /**
   * "edge" (padrao): remove so a pontuacao do comeco e do fim.
   * "all": remove toda pontuacao, exceto apostrofo no meio de palavra.
   */
  readonly punctuation?: "edge" | "all";
}

const CURLY_APOSTROPHES = /[‘’ʼ]/g;
const COMBINING_MARKS = /\p{M}/gu;
const EDGE_PUNCTUATION = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;
const ANY_PUNCTUATION = /[^\p{L}\p{N}\s']/gu;
const EDGE_APOSTROPHES = /(^|\s)'+|'+(?=\s|$)/g;

function collapseSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function normalizeText(text: string, options: NormalizeOptions = {}): string {
  const { caseSensitive = false, punctuation = "edge" } = options;
  let result = text.replace(CURLY_APOSTROPHES, "'").normalize("NFD").replace(COMBINING_MARKS, "");
  result = collapseSpaces(result);
  if (punctuation === "all") {
    result = collapseSpaces(result.replace(ANY_PUNCTUATION, " ").replace(EDGE_APOSTROPHES, "$1"));
  } else {
    result = collapseSpaces(result.replace(EDGE_PUNCTUATION, ""));
  }
  return caseSensitive ? result : result.toLowerCase();
}

export function tokenizeWords(text: string, options: NormalizeOptions = {}): string[] {
  const normalized = normalizeText(text, options);
  return normalized === "" ? [] : normalized.split(" ");
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  // Indices sempre dentro dos limites; o cast evita ramos mortos por noUncheckedIndexedAccess.
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current.push(
        Math.min(
          (previous[j] as number) + 1,
          (current[j - 1] as number) + 1,
          (previous[j - 1] as number) + cost,
        ),
      );
    }
    previous = current;
  }
  return previous[b.length] as number;
}
