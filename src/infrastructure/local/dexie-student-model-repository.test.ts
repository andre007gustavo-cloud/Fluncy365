import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentModel } from "@/domain/entities/student";
import { FixedClock } from "@/infrastructure/fakes/in-memory-repositories";
import { DexieStudentModelRepository } from "./dexie-student-model-repository";
import { LocalDatabase } from "./local-db";
import { OfflineQueue } from "./offline-queue";

const NOW = new Date("2026-03-10T12:00:00Z");

let counter = 0;
let db: LocalDatabase;
let repo: DexieStudentModelRepository;

function model(userId: string, vocabSize = 120): StudentModel {
  return {
    userId,
    levels: { reading: 1.5, listening: 1.2, writing: 1, speaking: 1.1 },
    vocabSize,
    pace: { avgSecondsPerExercise: 20, sessionCompletionRate: 0.9, usualHour: null },
    updatedAt: NOW,
  };
}

beforeEach(() => {
  counter += 1;
  db = new LocalDatabase(`model-repo-${counter}`, { indexedDB: new IDBFactory(), IDBKeyRange });
  repo = new DexieStudentModelRepository(db, new FixedClock(NOW));
});

afterEach(() => {
  vi.restoreAllMocks();
  db.close();
});

describe("DexieStudentModelRepository", () => {
  it("devolve null quando nao ha modelo", async () => {
    expect(await repo.load("u1")).toBeNull();
  });

  it("salva, le de volta com Date e enfileira a operacao", async () => {
    await repo.save(model("u1"));

    expect(await repo.load("u1")).toEqual(model("u1"));
    const pending = await new OfflineQueue(db, new FixedClock(NOW))
      .pending("u1")
      .then((q) => q.operations);
    expect(pending.map((op) => op.operation.kind)).toEqual(["studentModel.save"]);
  });

  it("duas gravacoes viram uma operacao pendente com o ultimo estado", async () => {
    await repo.save(model("u1", 100));
    await repo.save(model("u1", 200));

    const pending = await new OfflineQueue(db, new FixedClock(NOW))
      .pending("u1")
      .then((q) => q.operations);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.operation.payload).toMatchObject({ vocabSize: 200 });
  });

  it("isola por usuario", async () => {
    await repo.save(model("u1"));

    expect(await repo.load("u2")).toBeNull();
  });

  it("desfaz a gravacao local quando o enqueue falha", async () => {
    vi.spyOn(OfflineQueue.prototype, "enqueue").mockRejectedValueOnce(new Error("falha"));

    await expect(repo.save(model("u1"))).rejects.toThrow("falha");

    expect(await repo.load("u1")).toBeNull();
  });

  it("applyRemote grava sem enfileirar", async () => {
    await repo.applyRemote(model("u1"));

    expect(await repo.load("u1")).toEqual(model("u1"));
    expect(await db.outbox.count()).toBe(0);
  });
});
