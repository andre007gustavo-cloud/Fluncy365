import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TopicMastery } from "@/domain/entities/student";
import { FixedClock } from "@/infrastructure/fakes/in-memory-repositories";
import { DexieTopicMasteryRepository } from "./dexie-topic-mastery-repository";
import { LocalDatabase } from "./local-db";
import { OfflineQueue } from "./offline-queue";

const NOW = new Date("2026-03-10T12:00:00Z");

let counter = 0;
let db: LocalDatabase;
let repo: DexieTopicMasteryRepository;

function mastery(topicId: string, accuracy = 0.5): TopicMastery {
  return { topicId, accuracy, attempts: 4, sessions: 1, lastSeen: NOW, status: "learning" };
}

beforeEach(() => {
  counter += 1;
  db = new LocalDatabase(`mastery-repo-${counter}`, { indexedDB: new IDBFactory(), IDBKeyRange });
  repo = new DexieTopicMasteryRepository(db, new FixedClock(NOW));
});

afterEach(() => {
  vi.restoreAllMocks();
  db.close();
});

describe("DexieTopicMasteryRepository", () => {
  it("grava, lista com Date e enfileira a operacao", async () => {
    await repo.upsert("u1", mastery("a"));
    await repo.upsert("u1", { ...mastery("b"), lastSeen: null });

    const list = await repo.list("u1");
    expect(list).toHaveLength(2);
    expect(list.find((m) => m.topicId === "a")).toEqual(mastery("a"));
    expect(list.find((m) => m.topicId === "b")?.lastSeen).toBeNull();
    const pending = await new OfflineQueue(db, new FixedClock(NOW))
      .pending("u1")
      .then((q) => q.operations);
    expect(pending.map((op) => op.operation.kind)).toEqual([
      "topicMastery.upsert",
      "topicMastery.upsert",
    ]);
  });

  it("atualiza o mesmo topico e coalesce a fila", async () => {
    await repo.upsert("u1", mastery("a", 0.5));
    await repo.upsert("u1", mastery("a", 0.9));

    expect((await repo.list("u1")).map((m) => m.accuracy)).toEqual([0.9]);
    const pending = await new OfflineQueue(db, new FixedClock(NOW))
      .pending("u1")
      .then((q) => q.operations);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.operation.payload).toMatchObject({ accuracy: 0.9 });
  });

  it("isola por usuario", async () => {
    await repo.upsert("u1", mastery("a"));
    await repo.upsert("u2", mastery("a", 0.1));

    expect((await repo.list("u1"))[0]?.accuracy).toBe(0.5);
    expect(await repo.list("u3")).toEqual([]);
  });

  it("desfaz a gravacao local quando o enqueue falha", async () => {
    vi.spyOn(OfflineQueue.prototype, "enqueue").mockRejectedValueOnce(new Error("falha"));

    await expect(repo.upsert("u1", mastery("a"))).rejects.toThrow("falha");

    expect(await repo.list("u1")).toEqual([]);
  });

  it("applyRemote grava sem enfileirar", async () => {
    await repo.applyRemote("u1", [mastery("a"), mastery("b")]);

    expect(await repo.list("u1")).toHaveLength(2);
    expect(await db.outbox.count()).toBe(0);
  });
});
