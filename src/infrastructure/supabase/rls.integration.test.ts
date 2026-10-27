/**
 * Teste de integração do isolamento por RLS (ADR-002).
 *
 * Como rodar: crie `.env.test.local` na raiz (já ignorado pelo git) com
 *   SUPABASE_TEST_URL=...
 *   SUPABASE_TEST_ANON_KEY=...
 *   SUPABASE_TEST_SERVICE_ROLE_KEY=...
 * apontando para um projeto Supabase de TESTE com as migrations aplicadas.
 * O teste cria e apaga seus próprios usuários e dados. Nunca commite chaves.
 * Sem as 3 variáveis, a suíte inteira é pulada (npm test e CI ficam verdes).
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

function loadLocalEnvFile(): void {
  try {
    process.loadEnvFile(".env.test.local");
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
    if (!missing) throw error;
  }
}

loadLocalEnvFile();

const envSchema = z.object({
  SUPABASE_TEST_URL: z.string().url(),
  SUPABASE_TEST_ANON_KEY: z.string().min(1),
  SUPABASE_TEST_SERVICE_ROLE_KEY: z.string().min(1),
});
const parsedEnv = envSchema.safeParse(process.env);

const NETWORK_TIMEOUT_MS = 30_000;
const authOptions = { persistSession: false, autoRefreshToken: false };

interface StudentTable {
  table: string;
  ownerColumn: "user_id" | "id";
  row: Record<string, unknown>;
  change: Record<string, unknown>;
}

const STUDENT_TABLES: StudentTable[] = [
  { table: "profiles", ownerColumn: "id", row: { name: "A" }, change: { name: "hack" } },
  {
    table: "student_models",
    ownerColumn: "user_id",
    row: { vocab_size: 10 },
    change: { vocab_size: 99 },
  },
  {
    table: "topic_mastery",
    ownerColumn: "user_id",
    row: { topic_id: "t1" },
    change: { attempts: 99 },
  },
  {
    table: "srs_cards",
    ownerColumn: "user_id",
    row: { front: "a", back: "b" },
    change: { back: "hack" },
  },
  {
    table: "error_log",
    ownerColumn: "user_id",
    row: { code: "e1", skill: "writing" },
    change: { count: 99 },
  },
  {
    table: "study_sessions",
    ownerColumn: "user_id",
    row: { day: "2000-01-01" },
    change: { xp: 99 },
  },
  {
    table: "gamification",
    ownerColumn: "user_id",
    row: { xp_total: 5 },
    change: { xp_total: 99 },
  },
];

const PUBLIC_READ_TABLES = ["content_units", "content_lessons", "content_jw_refs", "courses"];

describe.skipIf(!parsedEnv.success)("RLS: isolamento entre usuários", () => {
  const env = parsedEnv.success ? parsedEnv.data : undefined;
  const url = env?.SUPABASE_TEST_URL ?? "";
  const anonKey = env?.SUPABASE_TEST_ANON_KEY ?? "";
  const serviceKey = env?.SUPABASE_TEST_SERVICE_ROLE_KEY ?? "";

  const suffix = randomUUID().slice(0, 8);
  const ownerOnlyCourseId = `test-${suffix}`;
  const unitId = `test-unit-${suffix}`;
  const lessonId = `test-lesson-${suffix}`;
  const jwRefId = `test-jw-${suffix}`;
  const costDay = "2000-01-01";

  let admin: SupabaseClient;
  let anon: SupabaseClient;
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let userIdA = "";
  const createdUserIds: string[] = [];

  async function createSignedInUser(label: string) {
    const email = `rls-${label}-${suffix}@example.com`;
    const password = randomUUID();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`createUser ${label}: ${error?.message}`);
    createdUserIds.push(data.user.id);

    const client = createClient(url, anonKey, { auth: authOptions });
    const signIn = await client.auth.signInWithPassword({ email, password });
    if (signIn.error) throw new Error(`signIn ${label}: ${signIn.error.message}`);
    return { client, userId: data.user.id };
  }

  async function adminCount(spec: StudentTable): Promise<number> {
    const { count, error } = await admin
      .from(spec.table)
      .select("*", { count: "exact", head: true })
      .eq(spec.ownerColumn, userIdA);
    if (error) throw new Error(`admin count ${spec.table}: ${error.message}`);
    return count ?? 0;
  }

  beforeAll(async () => {
    admin = createClient(url, serviceKey, { auth: authOptions });
    anon = createClient(url, anonKey, { auth: authOptions });

    ({ client: clientA, userId: userIdA } = await createSignedInUser("a"));
    ({ client: clientB } = await createSignedInUser("b"));

    for (const spec of STUDENT_TABLES) {
      const { error } = await clientA
        .from(spec.table)
        .upsert({ [spec.ownerColumn]: userIdA, ...spec.row });
      if (error) throw new Error(`A grava ${spec.table}: ${error.message}`);
    }

    const seeds = [
      admin.from("courses").insert({
        id: ownerOnlyCourseId,
        name: "Curso de teste",
        ai_level: "corpus_only",
        audio: "link_only",
        visibility: "owner_only",
      }),
      admin.from("content_units").insert({ id: unitId, month: 1, week: 1, level: 1 }),
      admin.from("content_jw_refs").insert({
        id: jwRefId,
        url: "https://example.com",
        title: "t",
        type: "article",
        level: 1,
        minutes: 1,
      }),
      admin.from("admin_costs").insert({ day: costDay }),
    ];
    for (const { error } of await Promise.all(seeds)) {
      if (error) throw new Error(`seed: ${error.message}`);
    }
    const lesson = await admin
      .from("content_lessons")
      .insert({ id: lessonId, unit_id: unitId, day_index: 1 });
    if (lesson.error) throw new Error(`seed lição: ${lesson.error.message}`);
  }, NETWORK_TIMEOUT_MS);

  afterAll(async () => {
    if (!admin) return;
    await admin.from("content_units").delete().eq("id", unitId);
    await admin.from("content_jw_refs").delete().eq("id", jwRefId);
    await admin.from("admin_costs").delete().eq("day", costDay);
    await admin.from("courses").delete().eq("id", ownerOnlyCourseId);
    for (const id of createdUserIds) await admin.auth.admin.deleteUser(id);
  }, NETWORK_TIMEOUT_MS);

  describe.each(STUDENT_TABLES)("tabela $table", (spec) => {
    it(
      "B não lê linhas de A",
      async () => {
        const { data, error } = await clientB
          .from(spec.table)
          .select("*")
          .eq(spec.ownerColumn, userIdA);
        expect(error).toBeNull();
        expect(data).toEqual([]);
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "A lê a própria linha",
      async () => {
        const { data, error } = await clientA
          .from(spec.table)
          .select("*")
          .eq(spec.ownerColumn, userIdA);
        expect(error).toBeNull();
        expect(data?.length).toBeGreaterThan(0);
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "B não altera nem apaga linhas de A",
      async () => {
        const before = await adminCount(spec);
        expect(before).toBeGreaterThan(0);

        const updated = await clientB
          .from(spec.table)
          .update(spec.change)
          .eq(spec.ownerColumn, userIdA)
          .select();
        expect(updated.data ?? []).toEqual([]);

        const deleted = await clientB
          .from(spec.table)
          .delete()
          .eq(spec.ownerColumn, userIdA)
          .select();
        expect(deleted.data ?? []).toEqual([]);

        expect(await adminCount(spec)).toBe(before);
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "B não insere linha em nome de A",
      async () => {
        const { error } = await clientB
          .from(spec.table)
          .insert({ ...spec.row, [spec.ownerColumn]: userIdA });
        expect(error).not.toBeNull();
      },
      NETWORK_TIMEOUT_MS,
    );
  });

  describe("conteúdo, cursos e custos", () => {
    it.each(PUBLIC_READ_TABLES)(
      "anônimo não lê %s",
      async (table) => {
        const { data } = await anon.from(table).select("*");
        expect(data ?? []).toEqual([]);
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "autenticado lê conteúdo semeado",
      async () => {
        const { data, error } = await clientB.from("content_units").select("id").eq("id", unitId);
        expect(error).toBeNull();
        expect(data).toHaveLength(1);
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "autenticado lê o curso 'en'",
      async () => {
        const { data, error } = await clientB.from("courses").select("id").eq("id", "en");
        expect(error).toBeNull();
        expect(data).toHaveLength(1);
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "curso owner_only é invisível para não admin",
      async () => {
        const { data, error } = await clientB
          .from("courses")
          .select("id")
          .eq("id", ownerOnlyCourseId);
        expect(error).toBeNull();
        expect(data).toEqual([]);
      },
      NETWORK_TIMEOUT_MS,
    );

    it.each<[string, Record<string, unknown>]>([
      ["content_units", { id: `x-${suffix}`, month: 1, week: 1, level: 1 }],
      ["content_lessons", { id: `x-${suffix}`, unit_id: unitId, day_index: 2 }],
      [
        "content_jw_refs",
        {
          id: `x-${suffix}`,
          url: "https://example.com",
          title: "t",
          type: "article",
          level: 1,
          minutes: 1,
        },
      ],
      [
        "courses",
        { id: `x-${suffix}`, name: "x", ai_level: "full", audio: "tts", visibility: "shared" },
      ],
    ])(
      "autenticado não insere em %s",
      async (table, row) => {
        const { error } = await clientB.from(table).insert(row);
        expect(error).not.toBeNull();
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "autenticado não lê admin_costs",
      async () => {
        const { data } = await clientB.from("admin_costs").select("*").eq("day", costDay);
        expect(data ?? []).toEqual([]);
      },
      NETWORK_TIMEOUT_MS,
    );
  });

  describe("tables_without_rls()", () => {
    it(
      "service_role recebe lista vazia",
      async () => {
        const { data, error } = await admin.rpc("tables_without_rls");
        expect(error).toBeNull();
        expect(data).toEqual([]);
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "anon e authenticated não conseguem executar",
      async () => {
        expect((await anon.rpc("tables_without_rls")).error).not.toBeNull();
        expect((await clientB.rpc("tables_without_rls")).error).not.toBeNull();
      },
      NETWORK_TIMEOUT_MS,
    );
  });
});
