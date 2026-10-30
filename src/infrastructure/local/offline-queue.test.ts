import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SrsCard } from "@/domain/entities/srs-card";
import type { ClockPort } from "@/domain/ports/clock.port";
import { LocalDatabase } from "./local-db";
import { OfflineQueue } from "./offline-queue";

let counter = 0;
let db: LocalDatabase;
let queue: OfflineQueue;
let nowMs: number;

const clock: ClockPort = {
  now: () => new Date(nowMs),
  today: () => "2026-01-01",
};

function card(id: string, front = "hello"): SrsCard {
  return {
    id,
    front,
    back: "ola",
    type: "word",
    ease: 2.5,
    intervalDays: 0,
    dueAt: new Date(1000),
    lapses: 0,
    sourceLessonId: null,
  };
}

function rawRow(kind: string, payload: unknown) {
  return {
    userId: "u1",
    kind,
    entityKey: "x",
    payload,
    createdAt: 1,
    updatedAt: 1,
    attempts: 0,
    revision: 0,
    lastError: null,
  };
}

beforeEach(() => {
  counter += 1;
  nowMs = 1000;
  db = new LocalDatabase(`queue-test-${counter}`, { indexedDB: new IDBFactory(), IDBKeyRange });
  queue = new OfflineQueue(db, clock);
});

afterEach(() => db.close());

describe("OfflineQueue", () => {
  it("coalesce duas escritas no mesmo registro numa operacao com o payload mais recente", async () => {
    await queue.enqueue("u1", { kind: "srsCards.upsert", payload: card("c1", "v1") });
    nowMs = 2000;
    await queue.enqueue("u1", { kind: "srsCards.upsert", payload: card("c1", "v2") });

    const pending = await queue.pending("u1").then((q) => q.operations);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.operation.payload).toMatchObject({ front: "v2" });
    expect((await db.outbox.toArray())[0]?.updatedAt).toBe(2000);
  });

  it("preserva a ordem entre registros diferentes, mesmo apos coalescer", async () => {
    await queue.enqueue("u1", { kind: "srsCards.upsert", payload: card("a") });
    await queue.enqueue("u1", { kind: "srsCards.upsert", payload: card("b") });
    await queue.enqueue("u1", { kind: "srsCards.upsert", payload: card("a", "novo") });

    const ids = (await queue.pending("u1").then((q) => q.operations)).map((op) =>
      op.operation.kind === "srsCards.upsert" ? op.operation.payload.id : "",
    );
    expect(ids).toEqual(["a", "b"]);
  });

  it("nao coalesce kinds diferentes nem usuarios diferentes", async () => {
    const streak = { current: 1, best: 1, shieldsLeft: 2, lastDay: "2026-01-01" };
    await queue.enqueue("u1", { kind: "streak.save", payload: streak });
    await queue.enqueue("u1", { kind: "srsCards.upsert", payload: card("c1") });
    await queue.enqueue("u2", { kind: "srsCards.upsert", payload: card("c1") });

    expect(await queue.pending("u1").then((q) => q.operations)).toHaveLength(2);
    expect(await queue.pending("u2").then((q) => q.operations)).toHaveLength(1);
    expect(await queue.pending("u3").then((q) => q.operations)).toHaveLength(0);
  });

  it("ack remove a operacao", async () => {
    await queue.enqueue("u1", { kind: "srsCards.upsert", payload: card("c1") });
    const [first] = await queue.pending("u1").then((q) => q.operations);
    await queue.ack(first!.id, first!.revision);
    expect(await queue.pending("u1").then((q) => q.operations)).toHaveLength(0);
  });

  it("ack com revisao antiga mantem a linha editada depois do envio", async () => {
    await queue.enqueue("u1", { kind: "srsCards.upsert", payload: card("c1", "v1") });
    const [sent] = await queue.pending("u1").then((q) => q.operations);
    await queue.enqueue("u1", { kind: "srsCards.upsert", payload: card("c1", "v2") });

    expect(await queue.ack(sent!.id, sent!.revision)).toBe(false);

    const [kept] = await queue.pending("u1").then((q) => q.operations);
    expect(kept?.operation.payload).toMatchObject({ front: "v2" });
    expect(kept?.revision).toBe(sent!.revision + 1);
    expect(await queue.ack(kept!.id, kept!.revision)).toBe(true);
  });

  it("markFailed incrementa attempts e grava lastError; nova escrita zera", async () => {
    await queue.enqueue("u1", { kind: "srsCards.upsert", payload: card("c1") });
    const [first] = await queue.pending("u1").then((q) => q.operations);
    await queue.markFailed(first!.id, "offline");
    await queue.markFailed(first!.id, "timeout");

    const [failed] = await queue.pending("u1").then((q) => q.operations);
    expect(failed).toMatchObject({ attempts: 2, lastError: "timeout" });

    await queue.enqueue("u1", { kind: "srsCards.upsert", payload: card("c1", "v2") });
    expect((await queue.pending("u1").then((q) => q.operations))[0]).toMatchObject({
      attempts: 0,
      lastError: null,
    });
  });

  it("markFailed em id inexistente nao falha", async () => {
    await expect(queue.markFailed(999, "x")).resolves.toBeUndefined();
  });

  it("separa linhas invalidas das validas sem apaga-las", async () => {
    await db.outbox.add(rawRow("srsCards.upsert", { id: "c1" }));
    await db.outbox.add(rawRow("outra.coisa", {}));
    await queue.enqueue("u1", { kind: "srsCards.upsert", payload: card("ok") });

    const { operations, invalid } = await queue.pending("u1");

    expect(operations).toHaveLength(1);
    expect(invalid).toHaveLength(2);
    expect(invalid[0]).toMatchObject({ kind: "srsCards.upsert", entityKey: "x" });
    expect(invalid[0]?.message).toMatch(/invalida/);
    expect(await db.outbox.count()).toBe(3);
    expect(await queue.pendingKeys("u1")).toContain("outra.coisa:x");
  });

  it("participa de uma transacao externa e desfaz junto com ela", async () => {
    await expect(
      db.transaction("rw", db.outbox, db.srsCards, async () => {
        await queue.enqueue("u1", { kind: "srsCards.upsert", payload: card("c1") });
        throw new Error("falha");
      }),
    ).rejects.toThrow("falha");
    expect(await queue.pending("u1").then((q) => q.operations)).toHaveLength(0);
  });
});
