import { describe, expect, it } from "vitest";
import { SupabaseContentRepository } from "./supabase-content-repository";
import { jwRefFromRow, lessonFromRow, unitFromRow } from "./content-schemas";
import type { Supabase } from "./supabase-repositories";

const LESSON_ROW = {
  id: "u1-d1",
  unit_id: "u1",
  day_index: 1,
  blocks: [{ kind: "explanation", titlePt: "T", bodyPt: "B", examplesEn: ["I am"] }],
  exercises: [
    {
      id: "e1",
      kind: "multiple_choice",
      skill: "reading",
      difficulty: 2,
      prompt: { text: "Pick", instructionPt: "Escolha" },
      answerSpec: { mode: "choice", options: ["a", "b"], correctIndex: 1 },
      srsItems: [],
    },
    {
      id: "e2",
      kind: "match",
      skill: "reading",
      difficulty: 3,
      prompt: { text: "Match", instructionPt: "Associe", audioUrl: "https://x/a.mp3" },
      answerSpec: { mode: "pairs", pairs: [["a", "b"]] },
      srsItems: ["c1"],
    },
  ],
  status: "seed",
  version: 1,
};

const UNIT_ROW = {
  id: "u1",
  month: 1,
  week: 1,
  level: 1,
  grammar_topics: ["to-be"],
  vocab_list: ["hello"],
  pt_error_targets: ["aux"],
  jw_refs: ["jw1"],
  murphy_ref: null,
  mastery_criteria: { minAccuracy: 0.85, minAttempts: 12 },
};

describe("mapeadores de conteudo", () => {
  it("converte linha de licao em entidade", () => {
    const lesson = lessonFromRow(LESSON_ROW);

    expect(lesson).toMatchObject({ id: "u1-d1", unitId: "u1", dayIndex: 1, version: 1 });
    expect(lesson.exercises).toHaveLength(2);
  });

  it("rejeita licao com exercicio de modo desconhecido ou status invalido", () => {
    const badExercise = {
      ...LESSON_ROW,
      exercises: [{ ...LESSON_ROW.exercises[0], answerSpec: { mode: "x" } }],
    };
    expect(() => lessonFromRow(badExercise)).toThrow();
    expect(() => lessonFromRow({ ...LESSON_ROW, status: "draft" })).toThrow();
  });

  it("converte linha de unidade e rejeita criterio de dominio invalido", () => {
    expect(unitFromRow(UNIT_ROW)).toMatchObject({
      id: "u1",
      grammarTopics: ["to-be"],
      murphyRef: null,
      masteryCriteria: { minAccuracy: 0.85, minAttempts: 12 },
    });
    expect(() => unitFromRow({ ...UNIT_ROW, mastery_criteria: {} })).toThrow();
  });

  it("converte referencia JW e rejeita tipo desconhecido", () => {
    const row = {
      id: "jw1",
      url: "https://x",
      title: "T",
      type: "audio",
      level: 1,
      minutes: 5,
      topics: [],
    };
    expect(jwRefFromRow(row)).toEqual(row);
    expect(() => jwRefFromRow({ ...row, type: "podcast" })).toThrow();
  });
});

describe("SupabaseContentRepository", () => {
  it("saveLesson falha explicitamente: conteudo e so da service_role", async () => {
    const repo = new SupabaseContentRepository({} as Supabase);
    await expect(repo.saveLesson()).rejects.toThrow(/service_role/);
  });
});
