# ADR-001 — Supabase (PostgreSQL) no lugar do Firebase

- **Data:** 2026-09-08
- **Status:** Aceita
- **Contexto:** o planejamento original (seções 11.1 e 12) especificava Firebase Auth + Firestore.
  O dono do projeto pediu explicitamente para não usar o Firebase como banco de dados.

## Decisão

Usar **Supabase** (PostgreSQL gerenciado) para autenticação e banco de dados.

## Alternativas consideradas

| Opção                  | Por que não                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Neon / Turso + Auth.js | Banco e login viram dois serviços separados, com duas contas, dois SDKs e duas contas de custo para o dono operar. |
| PocketBase             | Exigiria manter um servidor próprio — contraria o RNF "sem servidor próprio" (seção 11.1).                         |
| Convex                 | Ótima experiência de desenvolvimento, mas modelo proprietário e sem caminho de saída equivalente a um dump SQL.    |
| **Supabase**           | **Escolhida.** Substitui Auth + Firestore num único produto, com RLS no lugar das Security Rules.                  |

## Consequências

### O que muda

1. **Modelo de dados relacional.** As subcoleções da seção 12 viram tabelas com chave
   `user_id` (ver `supabase/migrations/0001_initial_schema.sql`). O mapeamento é 1:1:

   | Firestore (plano original)      | Postgres (implementado)  |
   | ------------------------------- | ------------------------ |
   | `users/{uid}`                   | `public.profiles`        |
   | `users/{uid}.studentModel`      | `public.student_models`  |
   | `users/{uid}/topicMastery/{id}` | `public.topic_mastery`   |
   | `users/{uid}/srsCards/{id}`     | `public.srs_cards`       |
   | `users/{uid}/errorLog/{id}`     | `public.error_log`       |
   | `users/{uid}/sessions/{dia}`    | `public.study_sessions`  |
   | `users/{uid}/gamification`      | `public.gamification`    |
   | `content/units/{id}`            | `public.content_units`   |
   | `content/lessons/{id}`          | `public.content_lessons` |
   | `content/jwRefs/{id}`           | `public.content_jw_refs` |
   | `admin/costs/{dia}`             | `public.admin_costs`     |

2. **Regras de segurança → Row Level Security.** A regra "cada um só lê o que é seu" agora é
   uma policy SQL (`auth.uid() = user_id`), aplicada pelo próprio banco. Conteúdo é legível por
   qualquer autenticado e gravável só pela `service_role` (o proxy). `admin_costs` exige o
   claim `admin` no JWT.

3. **`firebase-admin` → `service_role` key.** O proxy `/api/tutor` (Fase 2) usa
   `createSupabaseAdminClient()`, que ignora o RLS. A chave nunca leva o prefixo `NEXT_PUBLIC_`.

4. **Verificação de token no proxy.** Em vez de `admin.auth().verifyIdToken()`, o proxy
   valida a sessão com `supabase.auth.getUser()`.

### O que **não** muda

- **Offline.** O plano já definia Dexie/IndexedDB como fonte local com SyncEngine próprio
  (seção 11.1) — a persistência offline do Firestore nunca entraria em jogo. Nada foi perdido.
- Arquitetura, ports, casos de uso, currículo, pedagogia, gamificação, custos de IA.
- O `AiTutorPort` e todos os contratos da seção 13 seguem idênticos.

### Ganhos colaterais

- A consulta central do SRS (`cartões vencidos até agora, ordenados, limite 20`) é um índice
  B-tree comum — em Firestore exigiria índices compostos e leituras cobradas por documento.
- Relatório semanal e painel de custos viram agregações SQL simples.
- Backup e saída do fornecedor via `pg_dump` padrão.

### Dívida assumida

- `src/infrastructure/supabase/database.types.ts` é mantido à mão até a Fase 1; depois deve ser
  gerado por `npx supabase gen types typescript`.
- As policies de RLS ainda não têm teste automatizado. A Fase 1 deve incluir um teste de
  integração que confirme que o usuário A não lê os dados do usuário B.
