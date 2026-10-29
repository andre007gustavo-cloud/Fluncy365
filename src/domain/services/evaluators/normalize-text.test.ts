import { describe, expect, it } from "vitest";
import { levenshtein, normalizeText, tokenizeWords } from "./normalize-text";

describe("normalizeText", () => {
  it("retorna vazio para vazio, so espacos ou so pontuacao", () => {
    expect(normalizeText("")).toBe("");
    expect(normalizeText("   \t ")).toBe("");
    expect(normalizeText("?!...")).toBe("");
    expect(normalizeText("?!...", { punctuation: "all" })).toBe("");
  });

  it("apara, colapsa espacos e ignora caixa por padrao", () => {
    expect(normalizeText("  Hello    WORLD \n")).toBe("hello world");
  });

  it("preserva a caixa quando caseSensitive", () => {
    expect(normalizeText(" Hello ", { caseSensitive: true })).toBe("Hello");
  });

  it("remove diacriticos", () => {
    expect(normalizeText("Café Açaí")).toBe("cafe acai");
  });

  it("converte apostrofo curvo em reto", () => {
    expect(normalizeText("Don’t")).toBe("don't");
    expect(normalizeText("itʼs")).toBe("it's");
  });

  it("nao expande contracoes", () => {
    expect(normalizeText("don't")).not.toBe("do not");
  });

  it("no modo edge remove so a pontuacao das bordas", () => {
    expect(normalizeText("¿Hello, world!")).toBe("hello, world");
    expect(normalizeText('"Yes."')).toBe("yes");
  });

  it("no modo all remove toda pontuacao exceto apostrofo interno", () => {
    expect(normalizeText("Hello, world! It's 'fine'.", { punctuation: "all" })).toBe(
      "hello world it's fine",
    );
  });

  it("mantem numeros sem converter", () => {
    expect(normalizeText("I have 2 cats.")).toBe("i have 2 cats");
  });
});

describe("tokenizeWords", () => {
  it("separa em palavras normalizadas", () => {
    expect(tokenizeWords("  The  CAT, sat. ", { punctuation: "all" })).toEqual([
      "the",
      "cat",
      "sat",
    ]);
  });

  it("retorna lista vazia para texto vazio", () => {
    expect(tokenizeWords("  ")).toEqual([]);
  });
});

describe("levenshtein", () => {
  it("calcula distancia de edicao", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("house", "hose")).toBe(1);
    expect(levenshtein("same", "same")).toBe(0);
  });

  it("trata strings vazias", () => {
    expect(levenshtein("", "")).toBe(0);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });
});
