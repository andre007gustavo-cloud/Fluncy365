/**
 * Teste de integração do isolamento do corpus do curso vmw (ADR-002, ADR-005).
 *
 * Como rodar: igual ao rls.integration.test.ts. Crie `.env.test.local` na raiz com
 *   SUPABASE_TEST_URL=...
 *   SUPABASE_TEST_ANON_KEY=...
 *   SUPABASE_TEST_SERVICE_ROLE_KEY=...
 * apontando para um projeto Supabase de TESTE com as migrations aplicadas (o curso
 * `vmw`, owner_only, vem da migration). Os dados semeados são fictícios; nada do
 * jw.org entra aqui. Sem as 3 variáveis, a suíte inteira é pulada.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { SupabaseFeatureFlags } from "./supabase-feature-flags";
import type { Supabase } from "./supabase-repositories";

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
const COURSE = "vmw";
const BUCKET = "vmw-media";

interface Ids {
  docId: string;
  segmentId: string;
  mediaId: string;
  entryId: string;
  questionId: string;
}

interface CorpusTable {
  table: string;
  row: (ids: Ids, suffix: string) => Record<string, unknown>;
  /** Campo que o update tenta alterar. */
  change: Record<string, unknown>;
}

const CORPUS_TABLES: CorpusTable[] = [
  {
    table: "corpus_documents",
    row: ({ docId }, suffix) => ({
      id: docId,
      course_id: COURSE,
      kind: "article",
      source_ref: `teste-${suffix}`,
      title_pt: "Titulo ficticio",
      title_vmw: "Titulo ficticio vmw",
    }),
    change: { title_pt: "hack" },
  },
  {
    table: "corpus_segments",
    row: ({ segmentId, docId }) => ({
      id: segmentId,
      course_id: COURSE,
      document_id: docId,
      paragraph_no: 1,
      position: 1,
      text_vmw: "frase ficticia",
      text_pt: "frase ficticia pt",
      text_normalized: "frase ficticia",
      alignment_score: 0.9,
    }),
    change: { text_pt: "hack" },
  },
  {
    table: "corpus_media",
    row: ({ mediaId, docId }, suffix) => ({
      id: mediaId,
      course_id: COURSE,
      document_id: docId,
      lang: "vmw",
      kind: "audio",
      storage_path: `library/teste-${suffix}.mp3`,
    }),
    change: { storage_path: "hack" },
  },
  {
    table: "media_clips",
    row: ({ mediaId, segmentId }) => ({
      course_id: COURSE,
      media_id: mediaId,
      segment_id: segmentId,
      scope: "sentence",
      start_ms: 0,
      end_ms: 1000,
    }),
    change: { end_ms: 2000 },
  },
  {
    table: "lexicon_entries",
    row: ({ entryId }, suffix) => ({
      id: entryId,
      course_id: COURSE,
      form: `forma-${suffix}`,
      form_normalized: `forma-${suffix}`,
    }),
    change: { status: "official" },
  },
  {
    table: "lexicon_evidence",
    row: ({ entryId, segmentId }) => ({
      course_id: COURSE,
      entry_id: entryId,
      segment_id: segmentId,
      sense: "sentido ficticio",
      supports: true,
    }),
    change: { supports: false },
  },
  {
    table: "grammar_patterns",
    row: (_ids, suffix) => ({
      course_id: COURSE,
      pattern: `padrao-${suffix}`,
      explanation_pt: "explicacao ficticia",
    }),
    change: { frequency: 99 },
  },
  {
    table: "informant_questions",
    row: ({ questionId }) => ({
      id: questionId,
      course_id: COURSE,
      question: "pergunta ficticia",
      origin: "teste",
    }),
    change: { priority: 5 },
  },
  {
    table: "phrasebook_entries",
    row: (_ids, suffix) => ({
      course_id: COURSE,
      phrase_vmw: `frase-${suffix}`,
      phrase_pt: "frase ficticia pt",
      situation: "teste",
    }),
    change: { situation: "hack" },
  },
  {
    table: "agent_eval_runs",
    row: () => ({
      course_id: COURSE,
      batch_ref: "lote-teste",
      model: "modelo-teste",
      prompt_version: "v0",
      total_cases: 1,
      passed_cases: 1,
    }),
    change: { passed_cases: 0 },
  },
  {
    table: "corpus_lessons",
    row: (_ids, suffix) => ({
      course_id: COURSE,
      lesson_key: `licao-${suffix}`,
      prompt_version: "v0",
      content: {},
    }),
    change: { prompt_version: "hack" },
  },
];

describe.skipIf(!parsedEnv.success)("RLS: corpus, mídia e léxico do curso vmw", () => {
  const env = parsedEnv.success ? parsedEnv.data : undefined;
  const url = env?.SUPABASE_TEST_URL ?? "";
  const anonKey = env?.SUPABASE_TEST_ANON_KEY ?? "";
  const serviceKey = env?.SUPABASE_TEST_SERVICE_ROLE_KEY ?? "";

  const suffix = randomUUID().slice(0, 8);
  const ids: Ids = {
    docId: randomUUID(),
    segmentId: randomUUID(),
    mediaId: randomUUID(),
    entryId: randomUUID(),
    questionId: randomUUID(),
  };
  const libraryPath = `library/teste-${suffix}.txt`;

  let service: SupabaseClient;
  let anon: SupabaseClient;
  let adminClient: SupabaseClient;
  let clientB: SupabaseClient;
  let adminId = "";
  let userIdB = "";
  let userIdC = "";
  const createdUserIds: string[] = [];
  const uploadedPaths: string[] = [];

  async function createSignedInUser(label: string, appMetadata?: Record<string, unknown>) {
    const email = `corpus-${label}-${suffix}@example.com`;
    const password = randomUUID();
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: appMetadata,
    });
    if (error || !data.user) throw new Error(`createUser ${label}: ${error?.message}`);
    createdUserIds.push(data.user.id);

    const client = createClient(url, anonKey, { auth: authOptions });
    const signIn = await client.auth.signInWithPassword({ email, password });
    if (signIn.error) throw new Error(`signIn ${label}: ${signIn.error.message}`);
    return { client, userId: data.user.id };
  }

  async function upload(client: SupabaseClient, path: string) {
    const result = await client.storage
      .from(BUCKET)
      .upload(path, new Blob(["conteudo ficticio"], { type: "text/plain" }));
    if (!result.error) uploadedPaths.push(path);
    return result;
  }

  beforeAll(async () => {
    service = createClient(url, serviceKey, { auth: authOptions });
    anon = createClient(url, anonKey, { auth: authOptions });

    ({ client: adminClient, userId: adminId } = await createSignedInUser("admin", {
      admin: true,
    }));
    ({ client: clientB, userId: userIdB } = await createSignedInUser("b"));
    ({ userId: userIdC } = await createSignedInUser("c"));

    for (const spec of CORPUS_TABLES) {
      const { error } = await service.from(spec.table).insert(spec.row(ids, suffix));
      if (error) throw new Error(`seed ${spec.table}: ${error.message}`);
    }

    const contest = await service.from("lexicon_contests").insert({
      user_id: userIdC,
      course_id: COURSE,
      entry_id: ids.entryId,
      reason: "contestacao ficticia",
    });
    if (contest.error) throw new Error(`seed contestação: ${contest.error.message}`);

    const answer = await service.from("informant_answers").insert({
      user_id: userIdC,
      course_id: COURSE,
      question_id: ids.questionId,
      answer: "resposta ficticia",
    });
    if (answer.error) throw new Error(`seed resposta: ${answer.error.message}`);

    for (const path of [libraryPath, `users/${adminId}/seed-${suffix}.txt`]) {
      const result = await upload(service, path);
      if (result.error) throw new Error(`seed objeto ${path}: ${result.error.message}`);
    }
  }, NETWORK_TIMEOUT_MS);

  afterAll(async () => {
    if (!service) return;
    if (uploadedPaths.length > 0) await service.storage.from(BUCKET).remove(uploadedPaths);

    // Documentos e entradas levam segmentos, midia, clipes, evidencias e contestacoes junto.
    await service.from("informant_questions").delete().eq("id", ids.questionId);
    await service.from("lexicon_entries").delete().eq("id", ids.entryId);
    await service.from("corpus_documents").delete().eq("id", ids.docId);
    await service.from("grammar_patterns").delete().eq("pattern", `padrao-${suffix}`);
    await service.from("phrasebook_entries").delete().eq("phrase_vmw", `frase-${suffix}`);
    await service.from("agent_eval_runs").delete().eq("batch_ref", "lote-teste");
    await service.from("corpus_lessons").delete().eq("lesson_key", `licao-${suffix}`);

    for (const id of createdUserIds) await service.auth.admin.deleteUser(id);
  }, NETWORK_TIMEOUT_MS);

  describe("leitura do corpus", () => {
    it.each(CORPUS_TABLES.map((spec) => spec.table))(
      "B (comum) não lê %s",
      async (table) => {
        const { data, error } = await clientB.from(table).select("*");
        expect(error).toBeNull();
        expect(data).toEqual([]);
      },
      NETWORK_TIMEOUT_MS,
    );

    it.each(CORPUS_TABLES.map((spec) => spec.table))(
      "admin lê %s",
      async (table) => {
        const { data, error } = await adminClient.from(table).select("*");
        expect(error).toBeNull();
        expect(data?.length).toBeGreaterThan(0);
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "B não enxerga o curso vmw e o admin enxerga",
      async () => {
        const forB = await clientB.from("courses").select("id").eq("id", COURSE);
        const forAdmin = await adminClient.from("courses").select("id").eq("id", COURSE);
        expect(forB.data).toEqual([]);
        expect(forAdmin.data).toEqual([{ id: COURSE }]);
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "anônimo não lê as tabelas do corpus",
      async () => {
        for (const { table } of CORPUS_TABLES) {
          const { data } = await anon.from(table).select("*");
          expect(data ?? []).toEqual([]);
        }
      },
      NETWORK_TIMEOUT_MS,
    );
  });

  describe("escrita no corpus: só a service_role", () => {
    describe.each([
      ["admin", () => adminClient],
      ["B (comum)", () => clientB],
    ])("%s", (_label, getClient) => {
      it.each(CORPUS_TABLES)(
        "não insere em $table",
        async ({ table, row }) => {
          const { error } = await getClient()
            .from(table)
            .insert(row({ ...ids, docId: randomUUID() }, `x${suffix}`));
          expect(error).not.toBeNull();
        },
        NETWORK_TIMEOUT_MS,
      );

      it.each(CORPUS_TABLES)(
        "não altera $table",
        async ({ table, change }) => {
          const { error } = await getClient().from(table).update(change);
          expect(error).not.toBeNull();
        },
        NETWORK_TIMEOUT_MS,
      );

      it.each(CORPUS_TABLES)(
        "não apaga de $table",
        async ({ table }) => {
          const { error } = await getClient().from(table).delete().not("id", "is", null);
          expect(error).not.toBeNull();
        },
        NETWORK_TIMEOUT_MS,
      );
    });

    it(
      "as linhas semeadas seguem intactas depois das tentativas",
      async () => {
        for (const { table } of CORPUS_TABLES) {
          const { count, error } = await service
            .from(table)
            .select("*", { count: "exact", head: true })
            .eq("course_id", COURSE);
          expect(error).toBeNull();
          expect(count).toBeGreaterThan(0);
        }
      },
      NETWORK_TIMEOUT_MS,
    );
  });

  describe("mídia (bucket vmw-media)", () => {
    it(
      "B não baixa library/ nem users/<admin>/",
      async () => {
        const library = await clientB.storage.from(BUCKET).download(libraryPath);
        const own = await clientB.storage
          .from(BUCKET)
          .download(`users/${adminId}/seed-${suffix}.txt`);
        expect(library.error).not.toBeNull();
        expect(own.error).not.toBeNull();
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "B não lista library/ nem users/<admin>/",
      async () => {
        const library = await clientB.storage.from(BUCKET).list("library");
        const users = await clientB.storage.from(BUCKET).list(`users/${adminId}`);
        expect(library.data ?? []).toEqual([]);
        expect(users.data ?? []).toEqual([]);
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "admin baixa library/",
      async () => {
        const { data, error } = await adminClient.storage.from(BUCKET).download(libraryPath);
        expect(error).toBeNull();
        expect(await data?.text()).toBe("conteudo ficticio");
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "B não sobe em users/<B>/ (curso invisível)",
      async () => {
        const { error } = await upload(clientB, `users/${userIdB}/b-${suffix}.txt`);
        expect(error).not.toBeNull();
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "admin sobe em users/<admin>/",
      async () => {
        const { error } = await upload(adminClient, `users/${adminId}/novo-${suffix}.txt`);
        expect(error).toBeNull();
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "admin não sobe em users/<B>/ nem em library/",
      async () => {
        const inOther = await upload(adminClient, `users/${userIdB}/admin-${suffix}.txt`);
        const inLibrary = await upload(adminClient, `library/admin-${suffix}.txt`);
        expect(inOther.error).not.toBeNull();
        expect(inLibrary.error).not.toBeNull();
      },
      NETWORK_TIMEOUT_MS,
    );
  });

  describe("contestações e respostas do falante", () => {
    it(
      "B não grava contestação nem resposta (curso invisível)",
      async () => {
        const contest = await clientB.from("lexicon_contests").insert({
          user_id: userIdB,
          course_id: COURSE,
          entry_id: ids.entryId,
          reason: "tentativa",
        });
        const answer = await clientB.from("informant_answers").insert({
          user_id: userIdB,
          course_id: COURSE,
          question_id: ids.questionId,
          answer: "tentativa",
        });
        expect(contest.error?.code).toBe("42501");
        expect(answer.error?.code).toBe("42501");
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "admin grava as próprias e lê de volta",
      async () => {
        const contest = await adminClient.from("lexicon_contests").insert({
          user_id: adminId,
          course_id: COURSE,
          entry_id: ids.entryId,
          reason: "contestação do admin",
        });
        const answer = await adminClient.from("informant_answers").insert({
          user_id: adminId,
          course_id: COURSE,
          question_id: ids.questionId,
          answer: "resposta do admin",
        });
        expect(contest.error).toBeNull();
        expect(answer.error).toBeNull();

        const mine = await adminClient.from("lexicon_contests").select("user_id");
        expect(mine.data?.every((r) => r.user_id === adminId)).toBe(true);
        expect(mine.data?.length).toBeGreaterThan(0);
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "admin não grava em nome de outro usuário",
      async () => {
        const { error } = await adminClient.from("lexicon_contests").insert({
          user_id: userIdB,
          course_id: COURSE,
          entry_id: ids.entryId,
          reason: "em nome de B",
        });
        expect(error?.code).toBe("42501");
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "um usuário não lê linhas de outro",
      async () => {
        for (const table of ["lexicon_contests", "informant_answers"]) {
          const admins = await adminClient.from(table).select("user_id").eq("user_id", userIdC);
          const others = await clientB.from(table).select("user_id");
          expect(admins.data).toEqual([]);
          expect(others.data).toEqual([]);
        }
      },
      NETWORK_TIMEOUT_MS,
    );
  });

  describe("vínculo de curso nas relações (FK composta)", () => {
    it(
      "contestação em 'en' não aponta para entrada do vmw",
      async () => {
        const { error } = await clientB.from("lexicon_contests").insert({
          user_id: userIdB,
          course_id: "en",
          entry_id: ids.entryId,
          reason: "cruzando cursos",
        });
        expect(error?.code).toBe("23503");
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "resposta em 'en' não aponta para pergunta do vmw",
      async () => {
        const { error } = await clientB.from("informant_answers").insert({
          user_id: userIdB,
          course_id: "en",
          question_id: ids.questionId,
          answer: "cruzando cursos",
        });
        expect(error?.code).toBe("23503");
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "segmento em 'en' não aponta para documento do vmw (nem com service_role)",
      async () => {
        const { error } = await service.from("corpus_segments").insert({
          course_id: "en",
          document_id: ids.docId,
          paragraph_no: 9,
          position: 9,
          text_vmw: "x",
          text_pt: "x",
          text_normalized: "x",
          alignment_score: 0.5,
        });
        expect(error?.code).toBe("23503");
      },
      NETWORK_TIMEOUT_MS,
    );
  });

  describe("linhas de usuário: alheias e user_id", () => {
    it(
      "admin não altera nem apaga contestação de outro usuário",
      async () => {
        await adminClient
          .from("lexicon_contests")
          .update({ reason: "hack" })
          .eq("user_id", userIdC);
        await adminClient.from("lexicon_contests").delete().eq("user_id", userIdC);

        const { data, error } = await service
          .from("lexicon_contests")
          .select("reason")
          .eq("user_id", userIdC);
        expect(error).toBeNull();
        expect(data).toEqual([{ reason: "contestacao ficticia" }]);
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "usuário não muda o user_id da própria linha",
      async () => {
        const created = await adminClient
          .from("lexicon_contests")
          .insert({
            user_id: adminId,
            course_id: COURSE,
            entry_id: ids.entryId,
            reason: "para trocar dono",
          })
          .select("id")
          .single();
        expect(created.error).toBeNull();

        const { error } = await adminClient
          .from("lexicon_contests")
          .update({ user_id: userIdB })
          .eq("id", created.data?.id);
        expect(error?.code).toBe("42501");
      },
      NETWORK_TIMEOUT_MS,
    );

    it(
      "usuário recém-criado tem student_models e gamification em 'en' (trigger)",
      async () => {
        for (const table of ["student_models", "gamification"]) {
          const { data, error } = await service
            .from(table)
            .select("course_id")
            .eq("user_id", userIdB);
          expect(error).toBeNull();
          expect(data).toEqual([{ course_id: "en" }]);
        }
      },
      NETWORK_TIMEOUT_MS,
    );
  });

  describe("feature flag module_vmw", () => {
    it(
      "true para o admin e false para B",
      async () => {
        const forAdmin = new SupabaseFeatureFlags(adminClient as unknown as Supabase);
        const forB = new SupabaseFeatureFlags(clientB as unknown as Supabase);
        await expect(forAdmin.isEnabled("module_vmw")).resolves.toBe(true);
        await expect(forB.isEnabled("module_vmw")).resolves.toBe(false);
      },
      NETWORK_TIMEOUT_MS,
    );
  });

  describe("tables_without_rls()", () => {
    it(
      "continua vazia com as tabelas do corpus",
      async () => {
        const { data, error } = await service.rpc("tables_without_rls");
        expect(error).toBeNull();
        expect(data).toEqual([]);
      },
      NETWORK_TIMEOUT_MS,
    );
  });
});
