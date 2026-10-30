import { describe, expect, it } from "vitest";
import type { StudentError, TopicMastery } from "@/domain/entities/student";
import {
  studentErrorFromRow,
  studentErrorToRow,
  topicMasteryFromRow,
  topicMasteryToRow,
} from "./supabase-repositories";

const MASTERY: TopicMastery = {
  topicId: "present-simple",
  accuracy: 0.8,
  attempts: 10,
  sessions: 3,
  lastSeen: new Date("2026-03-10T12:00:00.000Z"),
  status: "learning",
};

const ERROR: StudentError = {
  code: "false-friend",
  example: "I pretend to go",
  count: 2,
  lastAt: new Date("2026-03-10T12:00:00.000Z"),
  skill: "writing",
};

describe("mapeadores de topic_mastery", () => {
  it("converte entidade em linha e de volta", () => {
    const row = topicMasteryToRow("u1", MASTERY);

    expect(row).toMatchObject({ user_id: "u1", course_id: "en", topic_id: "present-simple" });
    expect(row.last_seen).toBe("2026-03-10T12:00:00.000Z");
    expect(topicMasteryFromRow(row)).toEqual(MASTERY);
  });

  it("aceita last_seen nulo", () => {
    const row = topicMasteryToRow("u1", { ...MASTERY, lastSeen: null });
    expect(topicMasteryFromRow(row).lastSeen).toBeNull();
  });

  it("rejeita status desconhecido e campos faltando", () => {
    const row = topicMasteryToRow("u1", MASTERY);
    expect(() => topicMasteryFromRow({ ...row, status: "unknown" })).toThrow();
    expect(() => topicMasteryFromRow({ topic_id: "x" })).toThrow();
  });
});

describe("mapeadores de error_log", () => {
  it("converte entidade em linha e de volta", () => {
    const row = studentErrorToRow("u1", ERROR);

    expect(row).toMatchObject({ user_id: "u1", course_id: "en", code: "false-friend" });
    expect(studentErrorFromRow(row)).toEqual(ERROR);
  });

  it("rejeita skill desconhecida e contagem nao inteira", () => {
    const row = studentErrorToRow("u1", ERROR);
    expect(() => studentErrorFromRow({ ...row, skill: "dancing" })).toThrow();
    expect(() => studentErrorFromRow({ ...row, count: 1.5 })).toThrow();
  });
});
