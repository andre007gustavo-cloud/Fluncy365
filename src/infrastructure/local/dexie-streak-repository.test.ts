import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Streak } from "@/domain/entities/streak";
import { EMPTY_STREAK, FixedClock } from "@/infrastructure/fakes/in-memory-repositories";
import { DexieStreakRepository } from "./dexie-streak-repository";
import { LocalDatabase } from "./local-db";
import { OfflineQueue } from "./offline-queue";

const NOW = new Date("2026-03-10T12:00:00Z");
const STREAK: Streak = { current: 4, best: 9, shieldsLeft: 1, lastDay: "2026-03-10" };

let counter = 0;
let db: LocalDatabase;
let repo: DexieStreakRepository;

beforeEach(() => {
  counter += 1;
  db = new LocalDatabase(`streak-repo-${counter}`, { indexedDB: new IDBFactory(), IDBKeyRange });
  repo = new DexieStreakRepository(db, new FixedClock(NOW));
});

afterEach(() => {
  vi.restoreAllMocks();
  db.close();
});

describe("DexieStreakRepository", () => {
  it("devolve o streak vazio quando nao ha registro", async () => {
    expect(await repo.load("u1")).toEqual(EMPTY_STREAK);
  });

  it("salva, le de volta e enfileira a operacao", async () => {
    await repo.save("u1", STREAK);

    expect(await repo.load("u1")).toEqual(STREAK);
    const pending = await new OfflineQueue(db, new FixedClock(NOW))
      .pending("u1")
      .then((q) => q.operations);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.operation).toEqual({ kind: "streak.save", payload: STREAK });
    expect((await db.streaks.get("u1"))?.updatedAt).toBe(NOW.getTime());
  });

  it("isola por usuario", async () => {
    await repo.save("u1", STREAK);

    expect(await repo.load("u2")).toEqual(EMPTY_STREAK);
  });

  it("desfaz a gravacao local quando o enqueue falha", async () => {
    vi.spyOn(OfflineQueue.prototype, "enqueue").mockRejectedValueOnce(new Error("falha"));

    await expect(repo.save("u1", STREAK)).rejects.toThrow("falha");

    expect(await repo.load("u1")).toEqual(EMPTY_STREAK);
  });

  it("applyRemote grava sem enfileirar", async () => {
    await repo.applyRemote("u1", STREAK);

    expect(await repo.load("u1")).toEqual(STREAK);
    expect(await db.outbox.count()).toBe(0);
  });
});
