import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentError } from "@/domain/entities/student";
import { FixedClock } from "@/infrastructure/fakes/in-memory-repositories";
import { DexieErrorLogRepository } from "./dexie-error-log-repository";
import { LocalDatabase } from "./local-db";
import { OfflineQueue } from "./offline-queue";

const NOW = new Date("2026-03-10T12:00:00Z");

let counter = 0;
let db: LocalDatabase;
let repo: DexieErrorLogRepository;

function error(code: string, lastAtMs: number, count = 1): StudentError {
  return { code, example: `ex ${code}`, count, lastAt: new Date(lastAtMs), skill: "writing" };
}

beforeEach(() => {
  counter += 1;
  db = new LocalDatabase(`error-repo-${counter}`, { indexedDB: new IDBFactory(), IDBKeyRange });
  repo = new DexieErrorLogRepository(db, new FixedClock(NOW));
});

afterEach(() => {
  vi.restoreAllMocks();
  db.close();
});

describe("DexieErrorLogRepository", () => {
  it("listRecent devolve do mais recente ao mais antigo e respeita o limite", async () => {
    await repo.record("u1", error("old", 1000));
    await repo.record("u1", error("new", 3000));
    await repo.record("u1", error("mid", 2000));

    expect((await repo.listRecent("u1", 10)).map((e) => e.code)).toEqual(["new", "mid", "old"]);
    expect((await repo.listRecent("u1", 2)).map((e) => e.code)).toEqual(["new", "mid"]);
    expect(await repo.listRecent("u1", 0)).toEqual([]);
  });

  it("record do mesmo codigo substitui o registro e coalesce a fila", async () => {
    await repo.record("u1", error("tense", 1000, 1));
    await repo.record("u1", error("tense", 2000, 2));

    const [only] = await repo.listRecent("u1", 10);
    expect(only).toEqual(error("tense", 2000, 2));
    const pending = await new OfflineQueue(db, new FixedClock(NOW)).pending("u1");
    expect(pending).toHaveLength(1);
    expect(pending[0]?.operation.payload).toMatchObject({ count: 2 });
  });

  it("isola por usuario", async () => {
    await repo.record("u1", error("tense", 1000));
    await repo.record("u2", error("tense", 1000, 5));

    expect((await repo.listRecent("u1", 10))[0]?.count).toBe(1);
    expect(await repo.listRecent("u3", 10)).toEqual([]);
  });

  it("desfaz a gravacao local quando o enqueue falha", async () => {
    vi.spyOn(OfflineQueue.prototype, "enqueue").mockRejectedValueOnce(new Error("falha"));

    await expect(repo.record("u1", error("tense", 1000))).rejects.toThrow("falha");

    expect(await repo.listRecent("u1", 10)).toEqual([]);
  });

  it("applyRemote grava sem enfileirar", async () => {
    await repo.applyRemote("u1", [error("a", 1000), error("b", 2000)]);

    expect(await repo.listRecent("u1", 10)).toHaveLength(2);
    expect(await db.outbox.count()).toBe(0);
  });
});
