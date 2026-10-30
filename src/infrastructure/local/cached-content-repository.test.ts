import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JwRef, Lesson, UnitSpec } from "@/domain/entities/lesson";
import type { ContentRepositoryPort } from "@/domain/ports/content-repository.port";
import { FixedClock } from "@/infrastructure/fakes/in-memory-repositories";
import { CachedContentRepository } from "./cached-content-repository";
import { LocalDatabase } from "./local-db";

const NOW = new Date("2026-03-10T12:00:00Z");

const LESSON: Lesson = {
  id: "u1-d1",
  unitId: "u1",
  dayIndex: 1,
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
  ],
  status: "seed",
  version: 1,
};

const UNIT: UnitSpec = {
  id: "u1",
  month: 1,
  week: 1,
  level: 1,
  grammarTopics: ["to-be"],
  vocabList: ["hello"],
  ptErrorTargets: [],
  jwRefs: [],
  murphyRef: null,
  masteryCriteria: { minAccuracy: 0.85, minAttempts: 12 },
};

class FlakyRemote implements ContentRepositoryPort {
  down = false;
  lesson: Lesson | null = LESSON;
  unit: UnitSpec | null = UNIT;

  private guard(): void {
    if (this.down) throw new Error("sem rede");
  }
  async findUnit(): Promise<UnitSpec | null> {
    this.guard();
    return this.unit;
  }
  async findLesson(): Promise<Lesson | null> {
    this.guard();
    return this.lesson;
  }
  async saveLesson(): Promise<void> {
    throw new Error("somente service_role");
  }
  async listJwRefs(): Promise<readonly JwRef[]> {
    this.guard();
    return [];
  }
}

let counter = 0;
let db: LocalDatabase;
let remote: FlakyRemote;
let repo: CachedContentRepository;

beforeEach(() => {
  counter += 1;
  db = new LocalDatabase(`content-${counter}`, { indexedDB: new IDBFactory(), IDBKeyRange });
  remote = new FlakyRemote();
  repo = new CachedContentRepository(remote, db, new FixedClock(NOW));
});

afterEach(() => db.close());

describe("CachedContentRepository", () => {
  it("licao lida online continua disponivel com o remoto falhando", async () => {
    await repo.findLesson("u1", 1);
    remote.down = true;

    expect(await repo.findLesson("u1", 1)).toEqual(LESSON);
  });

  it("unidade lida online continua disponivel offline", async () => {
    await repo.findUnit("u1");
    remote.down = true;

    expect(await repo.findUnit("u1")).toEqual(UNIT);
  });

  it("sem cache e com o remoto falhando, relanca o erro original", async () => {
    remote.down = true;

    await expect(repo.findLesson("u1", 1)).rejects.toThrow("sem rede");
    await expect(repo.findUnit("u1")).rejects.toThrow("sem rede");
  });

  it("cache invalido nao e usado: relanca o erro original", async () => {
    await db.lessons.put({
      id: "u1-d1",
      unitId: "u1",
      dayIndex: 1,
      data: { lixo: true },
      updatedAt: 1,
    });
    remote.down = true;

    await expect(repo.findLesson("u1", 1)).rejects.toThrow("sem rede");
  });

  it("licao inexistente no remoto devolve null e nao cria cache", async () => {
    remote.lesson = null;

    expect(await repo.findLesson("u1", 1)).toBeNull();
    expect(await db.lessons.count()).toBe(0);
  });

  it("nova versao da mesma licao substitui a anterior no cache", async () => {
    await repo.findLesson("u1", 1);
    remote.lesson = { ...LESSON, id: "u1-d1-v2", version: 2 };
    await repo.findLesson("u1", 1);
    remote.down = true;

    expect((await repo.findLesson("u1", 1))?.version).toBe(2);
    expect(await db.lessons.count()).toBe(1);
  });

  it("saveLesson repassa o erro do remoto", async () => {
    await expect(repo.saveLesson(LESSON)).rejects.toThrow("service_role");
  });

  it("falha ao gravar o cache nao derruba a leitura remota bem-sucedida", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(db.lessons, "put").mockRejectedValue(new Error("quota"));
    vi.spyOn(db.units, "put").mockRejectedValue(new Error("quota"));

    expect(await repo.findLesson("u1", 1)).toEqual(LESSON);
    expect(await repo.findUnit("u1")).toEqual(UNIT);
    expect(consoleError).toHaveBeenCalledTimes(2);
    vi.restoreAllMocks();
  });

  it("remoto sem a licao ou a unidade apaga a entrada do cache", async () => {
    await repo.findLesson("u1", 1);
    await repo.findUnit("u1");
    remote.lesson = null;
    remote.unit = null;

    expect(await repo.findLesson("u1", 1)).toBeNull();
    expect(await repo.findUnit("u1")).toBeNull();
    remote.down = true;

    await expect(repo.findLesson("u1", 1)).rejects.toThrow("sem rede");
    await expect(repo.findUnit("u1")).rejects.toThrow("sem rede");
  });
});
