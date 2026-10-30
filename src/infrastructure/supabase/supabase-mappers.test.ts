import { describe, expect, it, vi } from "vitest";
import type { StudentError, TopicMastery } from "@/domain/entities/student";
import {
  studentErrorFromRow,
  studentErrorToRow,
  topicMasteryFromRow,
  topicMasteryToRow,
  SupabaseSrsCardRepository,
  SupabaseStreakRepository,
  type Supabase,
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
    const row = topicMasteryToRow("u1", "en", MASTERY);

    expect(row).toMatchObject({ user_id: "u1", course_id: "en", topic_id: "present-simple" });
    expect(row.last_seen).toBe("2026-03-10T12:00:00.000Z");
    expect(topicMasteryFromRow(row)).toEqual(MASTERY);
  });

  it("aceita last_seen nulo", () => {
    const row = topicMasteryToRow("u1", "en", { ...MASTERY, lastSeen: null });
    expect(topicMasteryFromRow(row).lastSeen).toBeNull();
  });

  it("rejeita status desconhecido e campos faltando", () => {
    const row = topicMasteryToRow("u1", "en", MASTERY);
    expect(() => topicMasteryFromRow({ ...row, status: "unknown" })).toThrow();
    expect(() => topicMasteryFromRow({ topic_id: "x" })).toThrow();
  });
});

describe("mapeadores de error_log", () => {
  it("converte entidade em linha e de volta", () => {
    const row = studentErrorToRow("u1", "en", ERROR);

    expect(row).toMatchObject({ user_id: "u1", course_id: "en", code: "false-friend" });
    expect(studentErrorFromRow(row)).toEqual(ERROR);
  });

  it("rejeita skill desconhecida e contagem nao inteira", () => {
    const row = studentErrorToRow("u1", "en", ERROR);
    expect(() => studentErrorFromRow({ ...row, skill: "dancing" })).toThrow();
    expect(() => studentErrorFromRow({ ...row, count: 1.5 })).toThrow();
  });
});

describe("SupabaseStreakRepository.save", () => {
  const streak = { current: 2, best: 4, shieldsLeft: 1, lastDay: "2026-03-10" };

  it("faz upsert pela chave (user_id, course_id), criando a linha se faltar", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn().mockReturnValue({ upsert }) } as unknown as Supabase;

    await new SupabaseStreakRepository(client).save("u1", "en", streak);

    expect(client.from).toHaveBeenCalledWith("gamification");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", course_id: "en", streak }),
      { onConflict: "user_id,course_id" },
    );
  });

  it("lanca erro com mensagem util quando o Supabase falha", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { message: "rls" } });
    const client = { from: () => ({ upsert }) } as unknown as Supabase;

    await expect(new SupabaseStreakRepository(client).save("u1", "en", streak)).rejects.toThrow(
      /save gamification.*rls/,
    );
  });
});

describe("repositorios Supabase usam o courseId recebido", () => {
  it("grava o course_id informado no upsert de cartoes SRS", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn().mockReturnValue({ upsert }) } as unknown as Supabase;
    const card = {
      id: "c1",
      front: "a",
      back: "b",
      type: "word" as const,
      ease: 2.5,
      intervalDays: 1,
      dueAt: new Date("2026-03-10T12:00:00.000Z"),
      lapses: 0,
      sourceLessonId: null,
    };

    await new SupabaseSrsCardRepository(client).upsertMany("u1", "vmw", [card]);

    expect(upsert).toHaveBeenCalledWith([expect.objectContaining({ course_id: "vmw" })]);
  });

  it("filtra a leitura pelo course_id informado", async () => {
    const eq = vi.fn();
    const query = { select: vi.fn(), eq, maybeSingle: vi.fn() };
    query.select.mockReturnValue(query);
    eq.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: null, error: null });
    const client = { from: vi.fn().mockReturnValue(query) } as unknown as Supabase;

    await new SupabaseStreakRepository(client).load("u1", "vmw");

    expect(eq).toHaveBeenCalledWith("course_id", "vmw");
  });
});
