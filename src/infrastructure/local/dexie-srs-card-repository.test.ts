import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SrsCard } from "@/domain/entities/srs-card";
import { FixedClock } from "@/infrastructure/fakes/in-memory-repositories";
import { DexieSrsCardRepository } from "./dexie-srs-card-repository";
import { LocalDatabase } from "./local-db";
import { OfflineQueue } from "./offline-queue";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-03-10T12:00:00Z");

let counter = 0;
let db: LocalDatabase;
let repo: DexieSrsCardRepository;

function card(id: string, dueOffsetDays: number): SrsCard {
  return {
    id,
    front: `front ${id}`,
    back: `back ${id}`,
    type: "word",
    ease: 2.5,
    intervalDays: 1,
    dueAt: new Date(NOW.getTime() + dueOffsetDays * DAY),
    lapses: 0,
    sourceLessonId: null,
  };
}

beforeEach(() => {
  counter += 1;
  db = new LocalDatabase(`srs-repo-${counter}`, { indexedDB: new IDBFactory(), IDBKeyRange });
  repo = new DexieSrsCardRepository(db, new FixedClock(NOW));
});

afterEach(() => {
  vi.restoreAllMocks();
  db.close();
});

describe("DexieSrsCardRepository", () => {
  it("listDue devolve so vencidos (inclusive agora), do mais antigo ao mais novo", async () => {
    await repo.upsertMany("u1", [
      card("future", 1),
      card("now", 0),
      card("old", -5),
      card("recent", -1),
    ]);

    const due = await repo.listDue("u1", NOW, 10);

    expect(due.map((c) => c.id)).toEqual(["old", "recent", "now"]);
  });

  it("listDue respeita o limite e limite zero devolve vazio", async () => {
    await repo.upsertMany("u1", [card("a", -3), card("b", -2), card("c", -1)]);

    expect((await repo.listDue("u1", NOW, 2)).map((c) => c.id)).toEqual(["a", "b"]);
    expect(await repo.listDue("u1", NOW, 0)).toEqual([]);
  });

  it("preserva as datas como Date na leitura", async () => {
    await repo.upsertMany("u1", [card("a", -1)]);
    const [read] = await repo.listAll("u1");
    expect(read).toEqual(card("a", -1));
  });

  it("isola os cartoes por usuario", async () => {
    await repo.upsertMany("u1", [card("a", -1)]);
    await repo.upsertMany("u2", [card("b", -1)]);

    expect((await repo.listAll("u1")).map((c) => c.id)).toEqual(["a"]);
    expect((await repo.listDue("u2", NOW, 10)).map((c) => c.id)).toEqual(["b"]);
  });

  it("upsertMany enfileira uma operacao por cartao, ja coalescida", async () => {
    await repo.upsertMany("u1", [card("a", -1), card("b", -1)]);
    await repo.upsertMany("u1", [card("a", 3)]);

    const pending = await new OfflineQueue(db, new FixedClock(NOW)).pending("u1");
    expect(pending.map((op) => op.operation.kind)).toEqual(["srsCards.upsert", "srsCards.upsert"]);
    expect(pending[0]?.operation.payload).toMatchObject({ id: "a", intervalDays: 1 });
    expect((await db.srsCards.get("a"))?.updatedAt).toBe(NOW.getTime());
  });

  it("desfaz a gravacao local quando o enqueue falha", async () => {
    vi.spyOn(OfflineQueue.prototype, "enqueue").mockRejectedValueOnce(new Error("falha"));

    await expect(repo.upsertMany("u1", [card("a", -1)])).rejects.toThrow("falha");

    expect(await db.srsCards.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
  });

  it("applyRemote grava sem enfileirar", async () => {
    await repo.applyRemote("u1", [card("a", -1)]);

    expect(await repo.listAll("u1")).toHaveLength(1);
    expect(await db.outbox.count()).toBe(0);
  });
});
