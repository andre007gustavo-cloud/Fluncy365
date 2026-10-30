import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SrsCard } from "@/domain/entities/srs-card";
import type { StudentError, TopicMastery } from "@/domain/entities/student";
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
import { DexieErrorLogRepository } from "./dexie-error-log-repository";
import { DexieSrsCardRepository } from "./dexie-srs-card-repository";
import { DexieStreakRepository } from "./dexie-streak-repository";
import { DexieStudentModelRepository } from "./dexie-student-model-repository";
import { DexieTopicMasteryRepository } from "./dexie-topic-mastery-repository";
import { LocalDatabase } from "./local-db";
import { OfflineQueue } from "./offline-queue";
import { SyncEngine, type RemoteRepositories } from "./sync-engine";

const NOW = new Date("2026-03-10T12:00:00Z");
const USER = "u1";
const COURSE = "en";

class InMemoryTopicMastery implements TopicMasteryRepositoryPort {
  readonly items = new Map<string, TopicMastery>();
  async list(): Promise<readonly TopicMastery[]> {
    return [...this.items.values()];
  }
  async upsert(_userId: string, _courseId: string, mastery: TopicMastery): Promise<void> {
    this.items.set(mastery.topicId, mastery);
  }
}

class InMemoryErrorLog implements ErrorLogRepositoryPort {
  readonly items = new Map<string, StudentError>();
  async listRecent(): Promise<readonly StudentError[]> {
    return [...this.items.values()];
  }
  async record(_userId: string, _courseId: string, error: StudentError): Promise<void> {
    this.items.set(error.code, error);
  }
}

function card(id: string, front = "hello"): SrsCard {
  return {
    id,
    front,
    back: "ola",
    type: "word",
    ease: 2.5,
    intervalDays: 0,
    dueAt: NOW,
    lapses: 0,
    sourceLessonId: null,
  };
}

let counter = 0;
let db: LocalDatabase;
let remote: RemoteRepositories;
let remoteSrs: InMemorySrsCardRepository;
let remoteDown: boolean;
let upsertCalls: number;
let duringUpsert: (() => Promise<void>) | null;
let duringRemoteRead: (() => Promise<void>) | null;
let localSrs: DexieSrsCardRepository;
let queue: OfflineQueue;
let engine: SyncEngine;

beforeEach(() => {
  counter += 1;
  remoteDown = false;
  upsertCalls = 0;
  duringRemoteRead = null;
  duringUpsert = null;
  const clock = new FixedClock(NOW);
  db = new LocalDatabase(`sync-${counter}`, { indexedDB: new IDBFactory(), IDBKeyRange });
  queue = new OfflineQueue(db, clock);
  localSrs = new DexieSrsCardRepository(db, clock);
  remoteSrs = new InMemorySrsCardRepository();

  remote = {
    srsCards: {
      listAll: async (userId, courseId) => {
        const snapshot = await remoteSrs.listAll(userId, courseId);
        await duringRemoteRead?.();
        return snapshot;
      },
      listDue: (userId, courseId, now, limit) => remoteSrs.listDue(userId, courseId, now, limit),
      upsertMany: async (userId, courseId, cards) => {
        upsertCalls += 1;
        if (remoteDown) throw new Error("sem rede");
        await duringUpsert?.();
        await remoteSrs.upsertMany(userId, courseId, cards);
      },
    },
    studentModel: new InMemoryStudentModelRepository(),
    streak: new InMemoryStreakRepository(),
    topicMastery: new InMemoryTopicMastery(),
    errorLog: new InMemoryErrorLog(),
  };
  engine = new SyncEngine(db, queue, remote, {
    srsCards: localSrs,
    studentModel: new DexieStudentModelRepository(db, clock),
    streak: new DexieStreakRepository(db, clock),
    topicMastery: new DexieTopicMasteryRepository(db, clock),
    errorLog: new DexieErrorLogRepository(db, clock),
  });
});

afterEach(() => db.close());

describe("SyncEngine", () => {
  it("remoto falhando: fila intacta e relatorio com erro", async () => {
    await localSrs.upsertMany(USER, COURSE, [card("a"), card("b")]);
    remoteDown = true;

    const report = await engine.sync(USER, COURSE);

    expect(report).toEqual({ pushed: 0, pulled: null, error: "sem rede" });
    const pending = await queue.pending(USER).then((q) => q.operations);
    expect(pending).toHaveLength(2);
    expect(pending[0]).toMatchObject({ attempts: 1, lastError: "sem rede" });
    expect(pending[1]).toMatchObject({ attempts: 0, lastError: null });
  });

  it("remoto volta: fila zera e o servidor recebe o valor mais recente", async () => {
    await localSrs.upsertMany(USER, COURSE, [card("a", "v1")]);
    await localSrs.upsertMany(USER, COURSE, [card("a", "v2")]);
    remoteDown = true;
    await engine.sync(USER, COURSE);
    remoteDown = false;

    const report = await engine.sync(USER, COURSE);

    expect(report.error).toBeNull();
    expect(report.pushed).toBe(1);
    expect(await queue.pending(USER).then((q) => q.operations)).toEqual([]);
    expect((await remoteSrs.listAll(USER, COURSE)).map((c) => c.front)).toEqual(["v2"]);
  });

  it("pull aplica dados do servidor quando nao ha pendencia", async () => {
    await remoteSrs.upsertMany(USER, COURSE, [card("srv", "do servidor")]);
    await remote.topicMastery.upsert(USER, COURSE, {
      topicId: "t1",
      accuracy: 1,
      attempts: 2,
      sessions: 1,
      lastSeen: null,
      status: "mastered",
    });

    const report = await engine.sync(USER, COURSE);

    expect(report.pulled).toBe(2);
    expect((await localSrs.listAll(USER, COURSE)).map((c) => c.front)).toEqual(["do servidor"]);
    expect(await db.outbox.count()).toBe(0);
  });

  it("pull nao apaga edicao local pendente", async () => {
    await remoteSrs.upsertMany(USER, COURSE, [card("a", "servidor"), card("b", "servidor")]);
    await localSrs.upsertMany(USER, COURSE, [card("a", "local")]);

    await engine.pull(USER, COURSE);

    const byId = new Map((await localSrs.listAll(USER, COURSE)).map((c) => [c.id, c.front]));
    expect(byId.get("a")).toBe("local");
    expect(byId.get("b")).toBe("servidor");
    expect(await queue.pending(USER).then((q) => q.operations)).toHaveLength(1);
  });

  it("sync concorrente roda uma vez so", async () => {
    await localSrs.upsertMany(USER, COURSE, [card("a")]);

    const [first, second] = await Promise.all([
      engine.sync(USER, COURSE),
      engine.sync(USER, COURSE),
    ]);

    expect(first).toBe(second);
    expect(upsertCalls).toBe(1);
  });

  it("linha corrompida e reportada, nao apagada, e nao trava o resto", async () => {
    await db.outbox.add({
      userId: USER,
      kind: "srsCards.upsert",
      entityKey: "x",
      payload: { id: "x" },
      createdAt: 1,
      updatedAt: 1,
      attempts: 0,
      revision: 0,
      lastError: null,
    });
    await localSrs.upsertMany(USER, COURSE, [card("ok")]);
    await remoteSrs.upsertMany(USER, COURSE, [card("x", "servidor"), card("y", "servidor")]);

    const report = await engine.sync(USER, COURSE);

    expect(report.error).toMatch(/invalida/);
    expect(report.pushed).toBe(1);
    expect(report.pulled).not.toBeNull();
    expect(await db.outbox.count()).toBe(1);
    const ids = (await localSrs.listAll(USER, COURSE)).map((c) => c.id).sort();
    expect(ids).toEqual(["ok", "y"]);
  });

  it("para na primeira falha e preserva a ordem", async () => {
    await localSrs.upsertMany(USER, COURSE, [card("a")]);
    await new DexieStreakRepository(db, new FixedClock(NOW)).save(USER, COURSE, {
      current: 1,
      best: 1,
      shieldsLeft: 2,
      lastDay: "2026-03-10",
    });
    remoteDown = true;

    const report = await engine.push(USER, COURSE);

    expect(report).toEqual({ pushed: 0, error: "sem rede", invalid: [] });
    expect(await queue.pending(USER).then((q) => q.operations)).toHaveLength(2);
  });
});

describe("SyncEngine - corrida entre leitura remota e gravacao local", () => {
  it("edicao local feita depois da leitura do servidor sobrevive ao pull", async () => {
    await remoteSrs.upsertMany(USER, COURSE, [card("a", "servidor"), card("b", "servidor")]);
    duringRemoteRead = () => localSrs.upsertMany(USER, COURSE, [card("a", "local")]);

    await engine.pull(USER, COURSE);

    const byId = new Map((await localSrs.listAll(USER, COURSE)).map((c) => [c.id, c.front]));
    expect(byId.get("a")).toBe("local");
    expect(byId.get("b")).toBe("servidor");
    expect(await queue.pending(USER).then((q) => q.operations)).toHaveLength(1);
  });
});

describe("SyncEngine - edicao durante o envio", () => {
  it("ack nao apaga a edicao feita durante o envio; o proximo push a envia", async () => {
    await localSrs.upsertMany(USER, COURSE, [card("a", "v1")]);
    duringUpsert = async () => {
      duringUpsert = null;
      await localSrs.upsertMany(USER, COURSE, [card("a", "v2")]);
    };

    const first = await engine.push(USER, COURSE);

    expect(first).toMatchObject({ pushed: 1, error: null });
    const pending = await queue.pending(USER).then((q) => q.operations);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.operation.payload).toMatchObject({ front: "v2" });

    await engine.pull(USER, COURSE);
    expect((await localSrs.listAll(USER, COURSE))[0]?.front).toBe("v2");

    await engine.push(USER, COURSE);
    expect(await queue.pending(USER).then((q) => q.operations)).toEqual([]);
    expect((await remoteSrs.listAll(USER, COURSE))[0]?.front).toBe("v2");
  });
});

describe("SyncEngine - reconexao durante um sync em curso", () => {
  it("chamada que chega durante um sync que falha gera nova rodada que envia", async () => {
    await localSrs.upsertMany(USER, COURSE, [card("a", "v1")]);
    let reconnect: Promise<unknown> = Promise.resolve();
    duringUpsert = async () => {
      duringUpsert = null;
      reconnect = engine.sync(USER, COURSE);
      throw new Error("conexao caiu");
    };

    const report = await engine.sync(USER, COURSE);
    await reconnect;

    expect(upsertCalls).toBe(2);
    expect(report.error).toBeNull();
    expect(await queue.pending(USER).then((q) => q.operations)).toEqual([]);
    expect((await remoteSrs.listAll(USER, COURSE))[0]?.front).toBe("v1");
  });
});

describe("SyncEngine - robustez do relatorio", () => {
  it("falha de leitura da fila vira erro no relatorio em vez de rejeitar", async () => {
    vi.spyOn(queue, "pending").mockRejectedValue(new Error("indexeddb indisponivel"));

    const report = await engine.sync(USER, COURSE);

    expect(report).toEqual({ pushed: 0, pulled: null, error: "indexeddb indisponivel" });
    vi.restoreAllMocks();
  });

  it("soma o pushed das rodadas quando ha nova rodada", async () => {
    await localSrs.upsertMany(USER, COURSE, [card("a")]);
    duringUpsert = async () => {
      duringUpsert = null;
      void engine.sync(USER, COURSE);
      await localSrs.upsertMany(USER, COURSE, [card("b")]);
    };

    const report = await engine.sync(USER, COURSE);

    expect(report.pushed).toBe(2);
    expect(await queue.pending(USER).then((q) => q.operations)).toEqual([]);
  });

  it("recusa curso sem armazenamento offline e nao toca na fila", async () => {
    await localSrs.upsertMany(USER, COURSE, [card("a")]);

    await expect(engine.sync(USER, "vmw")).rejects.toThrow(/offline.*"vmw"/);

    expect(upsertCalls).toBe(0);
    expect(await queue.pending(USER).then((q) => q.operations)).toHaveLength(1);
  });
});
