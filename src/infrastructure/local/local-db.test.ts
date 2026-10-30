import Dexie from "dexie";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";
import { LocalDatabase } from "./local-db";

let counter = 0;
const opened: Dexie[] = [];

function uniqueName(): string {
  counter += 1;
  return `fluente365-test-${counter}`;
}

function newIndexedDb() {
  return { indexedDB: new IDBFactory(), IDBKeyRange };
}

afterEach(() => {
  opened.splice(0).forEach((db) => db.close());
});

describe("LocalDatabase", () => {
  it("abre com todas as tabelas e o indice composto da outbox", async () => {
    const db = new LocalDatabase(uniqueName(), newIndexedDb());
    opened.push(db);
    await db.open();

    expect(db.tables.map((t) => t.name).sort()).toEqual([
      "errorLog",
      "lessons",
      "outbox",
      "srsCards",
      "streaks",
      "studentModels",
      "topicMastery",
      "units",
    ]);
    expect(db.outbox.schema.idxByName["[userId+kind+entityKey]"]).toBeDefined();
    expect(db.topicMastery.schema.primKey.keyPath).toEqual(["userId", "topicId"]);
    expect(db.errorLog.schema.primKey.keyPath).toEqual(["userId", "code"]);
    expect(db.lessons.schema.idxByName["[unitId+dayIndex]"]).toBeDefined();
  });

  it("sobe uma base v1 existente para v2 preservando os dados", async () => {
    const name = uniqueName();
    const options = newIndexedDb();

    const v1 = new Dexie(name, options);
    v1.version(1).stores({
      srsCards: "id, userId, dueAt, dirty, [userId+dueAt]",
      outbox: "++id, userId, createdAt",
    });
    await v1.open();
    await v1.table("srsCards").add({ id: "c1", userId: "u1", dueAt: 10, dirty: 1 });
    v1.close();

    const db = new LocalDatabase(name, options);
    opened.push(db);
    await db.open();

    expect(db.verno).toBe(2);
    expect((await db.srsCards.get("c1"))?.userId).toBe("u1");
    await db.outbox.add({
      userId: "u1",
      kind: "srs",
      entityKey: "c1",
      payload: {},
      createdAt: 1,
      updatedAt: 1,
      attempts: 0,
      revision: 0,
      lastError: null,
    });
    const found = await db.outbox
      .where("[userId+kind+entityKey]")
      .equals(["u1", "srs", "c1"])
      .count();
    expect(found).toBe(1);
  });
});
