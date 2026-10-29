import { tokenizeWords } from "./normalize-text";

export type WordOp =
  | { readonly type: "equal"; readonly word: string }
  | { readonly type: "missing"; readonly expected: string }
  | { readonly type: "extra"; readonly given: string }
  | { readonly type: "wrong"; readonly expected: string; readonly given: string };

type RawOp = Exclude<WordOp, { type: "wrong" }>;

function cell(table: number[][], i: number, j: number): number {
  // Indices sempre dentro dos limites; o cast evita ramos mortos por noUncheckedIndexedAccess.
  return (table[i] as number[])[j] as number;
}

function lcsTable(a: readonly string[], b: readonly string[]): number[][] {
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      (table[i] as number[])[j] =
        a[i - 1] === b[j - 1]
          ? cell(table, i - 1, j - 1) + 1
          : Math.max(cell(table, i - 1, j), cell(table, i, j - 1));
    }
  }
  return table;
}

export function lcsLength(a: readonly string[], b: readonly string[]): number {
  return cell(lcsTable(a, b), a.length, b.length);
}

function backtrack(ref: readonly string[], resp: readonly string[]): RawOp[] {
  const table = lcsTable(ref, resp);
  const ops: RawOp[] = [];
  let i = ref.length;
  let j = resp.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ref[i - 1] === resp[j - 1]) {
      ops.push({ type: "equal", word: ref[i - 1] as string });
      i--;
      j--;
    } else if (j === 0 || (i > 0 && cell(table, i - 1, j) >= cell(table, i, j - 1))) {
      ops.push({ type: "missing", expected: ref[i - 1] as string });
      i--;
    } else {
      ops.push({ type: "extra", given: resp[j - 1] as string });
      j--;
    }
  }
  return ops.reverse();
}

/** Entre duas palavras iguais, faltas e sobras são pareadas na ordem como trocas. */
function pairGaps(ops: readonly RawOp[]): WordOp[] {
  const result: WordOp[] = [];
  let missing: string[] = [];
  let extra: string[] = [];
  const flush = (): void => {
    const paired = Math.min(missing.length, extra.length);
    for (let k = 0; k < paired; k++) {
      result.push({ type: "wrong", expected: missing[k] as string, given: extra[k] as string });
    }
    for (const expected of missing.slice(paired)) result.push({ type: "missing", expected });
    for (const given of extra.slice(paired)) result.push({ type: "extra", given });
    missing = [];
    extra = [];
  };
  for (const op of ops) {
    if (op.type === "missing") missing.push(op.expected);
    else if (op.type === "extra") extra.push(op.given);
    else {
      flush();
      result.push(op);
    }
  }
  flush();
  return result;
}

export function diffWords(reference: string, response: string): WordOp[] {
  const ref = tokenizeWords(reference, { punctuation: "all" });
  const resp = tokenizeWords(response, { punctuation: "all" });
  return pairGaps(backtrack(ref, resp));
}
