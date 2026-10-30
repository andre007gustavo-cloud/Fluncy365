import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Lesson } from "@/domain/entities/lesson";
import type { SrsCard } from "@/domain/entities/srs-card";
import type { StudentError, TopicMastery } from "@/domain/entities/student";
import type { Streak } from "@/domain/entities/streak";
import type { ContentRepositoryPort } from "@/domain/ports/content-repository.port";
import type {
  ErrorLogRepositoryPort,
  TopicMasteryRepositoryPort,
} from "@/domain/ports/student-repository.port";
import {
  FixedClock,
  InMemorySrsCardRepository,
  InMemoryStreakRepository,
  InMemoryStudentModelRepository,
} from "@/infrastructure/fakes/in-memory-repositories";
import { startAutoSync } from "./auto-sync";
import { CachedContentRepository } from "./cached-content-repository";
import { DexieErrorLogRepository } from "./dexie-error-log-repository";
import { DexieSrsCardRepository } from "./dexie-srs-card-repository";
import { DexieStreakRepository } from "./dexie-streak-repository";
import { DexieStudentModelRepository } from "./dexie-student-model-repository";
import { DexieTopicMasteryRepository } from "./dexie-topic-mastery-repository";
import { LocalDatabase } from "./local-db";
import { OfflineQueue } from "./offline-queue";
import { SyncEngine, type SyncReport } from "./sync-engine";

const USER = "u1";
const NOW = new Date("2026-03-10T12:00:00Z");

const LESSON: Lesson = {
  id: "u1-d1",
  unitId: "u1",
  dayIndex: 1,
  blocks: [],
  exercises: [],
  status: "seed",
  version: 1,
};

class InMemoryTopicMastery implements TopicMasteryRepositoryPort {
  async list(): Promise<readonly TopicMastery[]> {
    return [];
  }
  async upsert(): Promise<void> {}
}

class InMemoryErrorLog implements ErrorLogRepositoryPort {
  async listRecent(): Promise<readonly StudentError[]> {
    return [];
  }
  async record(): Promise<void> {}
}

/** Faz todo metodo do remoto rejeitar enquanto a rede estiver "desligada". */
function switchable<T extends object>(target: T, isDown: () => boolean): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value: unknown = Reflect.get(obj, prop, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) =>
        isDown()
          ? Promise.reject(new Error("modo aviao"))
          : (value as (...a: unknown[]) => unknown).apply(obj, args);
    },
  });
}

function card(id: string, intervalDays: number): SrsCard {
  return {
    id,
    front: "hello",
    back: "ola",
    type: "word",
    ease: 2.5,
    intervalDays,
    dueAt: NOW,
    lapses: 0,
    sourceLessonId: null,
  };
}

let counter = 0;
let airplaneMode: boolean;
let db: LocalDatabase;
let remoteSrs: InMemorySrsCardRepository;
let remoteStreak: InMemoryStreakRepository;
let localSrs: DexieSrsCardRepository;
let localStreak: DexieStreakRepository;
let queue: OfflineQueue;
let engine: SyncEngine;
let content: CachedContentRepository;

beforeEach(() => {
  counter += 1;
  airplaneMode = false;
  const clock = new FixedClock(NOW);
  const isDown = () => airplaneMode;

  db = new LocalDatabase(`scenario-${counter}`, { indexedDB: new IDBFactory(), IDBKeyRange });
  queue = new OfflineQueue(db, clock);
  localSrs = new DexieSrsCardRepository(db, clock);
  localStreak = new DexieStreakRepository(db, clock);

  remoteSrs = new InMemorySrsCardRepository({ [USER]: [card("c1", 0)] });
  remoteStreak = new InMemoryStreakRepository({
    [USER]: { current: 3, best: 5, shieldsLeft: 2, lastDay: "2026-03-09" },
  });

  engine = new SyncEngine(
    db,
    queue,
    {
      srsCards: switchable(remoteSrs, isDown),
      studentModel: switchable(new InMemoryStudentModelRepository(), isDown),
      streak: switchable(remoteStreak, isDown),
      topicMastery: switchable(new InMemoryTopicMastery(), isDown),
      errorLog: switchable(new InMemoryErrorLog(), isDown),
    },
    {
      srsCards: localSrs,
      studentModel: new DexieStudentModelRepository(db, clock),
      streak: localStreak,
      topicMastery: new DexieTopicMasteryRepository(db, clock),
      errorLog: new DexieErrorLogRepository(db, clock),
    },
  );

  const remoteContent: ContentRepositoryPort = switchable(
    {
      findUnit: async () => null,
      findLesson: async () => LESSON,
      saveLesson: async () => {},
      listJwRefs: async () => [],
    } satisfies ContentRepositoryPort,
    isDown,
  );
  content = new CachedContentRepository(remoteContent, db, clock);
});

afterEach(() => db.close());

describe("cenario modo aviao", () => {
  it("estuda offline e sincroniza ao voltar a conexao", async () => {
    // 1. Primeiro carregamento online
    const firstSync = await engine.sync(USER);
    expect(firstSync).toMatchObject({ pushed: 0, error: null });
    expect((await localSrs.listAll(USER)).map((c) => c.id)).toEqual(["c1"]);
    expect((await localStreak.load(USER)).current).toBe(3);
    expect(await content.findLesson("u1", 1)).toEqual(LESSON);

    // 2. Modo aviao
    airplaneMode = true;

    // 3. Estudo offline: duas revisoes do mesmo cartao e o streak
    await localSrs.upsertMany(USER, [card("c1", 1)]);
    await localSrs.upsertMany(USER, [card("c1", 6)]);
    const studied: Streak = { current: 4, best: 5, shieldsLeft: 2, lastDay: "2026-03-10" };
    await localStreak.save(USER, studied);

    expect((await localSrs.listAll(USER))[0]?.intervalDays).toBe(6);
    expect(await localStreak.load(USER)).toEqual(studied);
    expect(await content.findLesson("u1", 1)).toEqual(LESSON);

    const failed = await engine.sync(USER);
    expect(failed).toEqual({ pushed: 0, pulled: null, error: "modo aviao" });
    const pending = await queue.pending(USER).then((q) => q.operations);
    expect(pending.map((op) => op.operation.kind)).toEqual(["srsCards.upsert", "streak.save"]);
    expect(pending[0]).toMatchObject({ attempts: 1, lastError: "modo aviao" });
    expect((await remoteSrs.listAll(USER))[0]?.intervalDays).toBe(0);

    // 4. A rede volta e o evento "online" dispara a sincronizacao
    const target = new EventTarget();
    const reports: SyncReport[] = [];
    const stop = startAutoSync(engine, USER, target, (r) => reports.push(r));
    await vi.waitFor(() => expect(reports).toHaveLength(1));
    expect(reports[0]?.error).toBe("modo aviao");

    airplaneMode = false;
    target.dispatchEvent(new Event("online"));
    await vi.waitFor(() => expect(reports).toHaveLength(2));
    stop();

    expect(reports[1]).toMatchObject({ pushed: 2, error: null });
    expect(await queue.pending(USER).then((q) => q.operations)).toEqual([]);
    expect((await remoteSrs.listAll(USER))[0]?.intervalDays).toBe(6);
    expect(await remoteStreak.load(USER)).toEqual(studied);
    expect((await localSrs.listAll(USER))[0]?.intervalDays).toBe(6);
  });
});
