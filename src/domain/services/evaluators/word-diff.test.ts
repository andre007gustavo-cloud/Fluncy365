import { describe, expect, it } from "vitest";
import { diffWords, lcsLength } from "./word-diff";

describe("lcsLength", () => {
  it("calcula a maior subsequência comum", () => {
    expect(lcsLength(["a", "b", "c"], ["a", "c"])).toBe(2);
    expect(lcsLength(["a", "b"], ["b", "a"])).toBe(1);
    expect(lcsLength([], ["a"])).toBe(0);
    expect(lcsLength([], [])).toBe(0);
  });
});

describe("diffWords", () => {
  it("marca tudo como igual quando idêntico, ignorando caixa e pontuação", () => {
    expect(diffWords("I like tea.", "i LIKE, tea")).toEqual([
      { type: "equal", word: "i" },
      { type: "equal", word: "like" },
      { type: "equal", word: "tea" },
    ]);
  });

  it("detecta palavra faltando", () => {
    expect(diffWords("I like green tea", "I like tea")).toEqual([
      { type: "equal", word: "i" },
      { type: "equal", word: "like" },
      { type: "missing", expected: "green" },
      { type: "equal", word: "tea" },
    ]);
  });

  it("detecta palavra sobrando", () => {
    expect(diffWords("I like tea", "I really like tea")).toEqual([
      { type: "equal", word: "i" },
      { type: "extra", given: "really" },
      { type: "equal", word: "like" },
      { type: "equal", word: "tea" },
    ]);
  });

  it("pareia falta e sobra adjacentes como troca", () => {
    expect(diffWords("I like tea", "I love tea")).toEqual([
      { type: "equal", word: "i" },
      { type: "wrong", expected: "like", given: "love" },
      { type: "equal", word: "tea" },
    ]);
  });

  it("pareia o que der e deixa o resto como falta ou sobra", () => {
    expect(diffWords("a b c d", "a x")).toEqual([
      { type: "equal", word: "a" },
      { type: "wrong", expected: "b", given: "x" },
      { type: "missing", expected: "c" },
      { type: "missing", expected: "d" },
    ]);
    expect(diffWords("a d", "a x y z")).toEqual([
      { type: "equal", word: "a" },
      { type: "wrong", expected: "d", given: "x" },
      { type: "extra", given: "y" },
      { type: "extra", given: "z" },
    ]);
  });

  it("lida com resposta vazia e referência vazia", () => {
    expect(diffWords("go home", "")).toEqual([
      { type: "missing", expected: "go" },
      { type: "missing", expected: "home" },
    ]);
    expect(diffWords("", "go")).toEqual([{ type: "extra", given: "go" }]);
    expect(diffWords("", "")).toEqual([]);
  });

  it("mantém apóstrofo interno", () => {
    expect(diffWords("I don't know", "I don’t know")).toEqual([
      { type: "equal", word: "i" },
      { type: "equal", word: "don't" },
      { type: "equal", word: "know" },
    ]);
  });
});
