# ADR-004 — Módulo emakhuwa: escopo, corpus, laboratório, agente e voz

- **Data:** 2026-10-30
- **Status:** Aceita

> **Alterado pelo [ADR-005](./ADR-005-acervo-autorizado.md):** a gravação no corpus pode usar a chave `service_role`, só no laboratório e no servidor, nunca no app e sempre fora do Git.

> **Alterado pelo [ADR-006](./ADR-006-laboratorio-com-assinatura.md):** o laboratório usa a assinatura pelo Claude Agent SDK, sem chave da API, e passa a processar o acervo na fase pessoal.

- **Contexto:** o `PLANEJAMENTO-EMAKHUWA.md` v0.1 previa um curso só de leitura, um coletor que buscava páginas do jw.org pelo servidor, áudio só por link e um tutor que nunca falaria emakhuwa (ADR-003). Em 29 e 30/10/2026 o André revisou o módulo e decidiu ampliá-lo. Este ADR registra as decisões de arquitetura; o plano completo está no `PLANEJAMENTO-EMAKHUWA.md` v1.0.

## Decisão

1. **Escopo: as quatro habilidades.** Leitura, escuta, escrita e fala, incluindo conversa do dia a dia em quatro degraus (seção 7.3 do plano). A produção sem gabarito oficial é validada por um falante fluente; sem ele, o módulo funciona como curso de leitura.
2. **Corpus no Supabase, só do André.** Corpus, léxico, padrões, mídia e transcrições ficam em tabelas com RLS por `user_id`, no curso `vmw` (`visibility = 'owner_only'`), e num bucket privado do Storage, com cópia offline no Dexie. Uso pessoal, sem distribuir. O André avaliou e aceitou esse uso diante dos termos do jw.org.
3. **Importação de arquivos, não coleta pelo site.** Substitui o `JwOrgFetcher` da v0.1. O André baixa pelos botões oficiais os EPUB, MP3 e MP4 nos dois idiomas, e o laboratório os importa. Nenhum robô acessa ou raspa o site. Colar texto continua como alternativa.
4. **Laboratório local (`lab/`).** Scripts no computador do André (TypeScript; Python só onde for preciso) que importam, alinham, analisam, cortam áudio, transcrevem vídeo, geram vozes candidatas e rodam a prova fixa do agente.
   - **Exceção à regra do proxy:** os scripts de `lab/` chamam a API da Anthropic direto, com `ANTHROPIC_API_KEY` só em `lab/.env.local` (no `.gitignore`). O código do app (`src/`) continua chamando a IA só pelo `/api/tutor`.
   - O laboratório autentica no Supabase como o próprio André (sessão de usuário), nunca com a chave `service_role`, e registra custo em `admin_costs` com `course_id = 'vmw'`.
5. **Agente professor com base de conhecimento.** Um `CorpusTutorPort`, separado do `AiTutorPort`, com seis ferramentas de consulta à base (seção 6.2 do plano). O agente é "treinado" em lotes, com uma prova fixa de cerca de 100 itens por lote. O modelo é o Opus 5.5 (ADENDO-v1.3).
6. **Travas em código.**
   - `CorpusGuard`: nenhuma frase em emakhuwa chega à tela sem existir no corpus ou no caderno verificado; exceções só sinalizadas como "hipótese".
   - `EvidenceScorer`: decide o status do léxico em seis níveis (oficial, verificado, confirmado, provável, hipótese, contestado).
   - Conferência de cobertura do alinhamento.
   - `SegmentSelector` (85-95% de palavras conhecidas).
7. **Áudio baixado.** `courses.audio` ganha o valor `'downloaded'`. O curso `vmw` agenda ditado, shadowing e "ouça e escolha" com o áudio oficial cortado por parágrafo (por frase, se o alinhamento forçado funcionar).
8. **O tutor fala emakhuwa.** Isso muda o item "O que não muda — Módulo emakhuwa" do ADR-003. Ordem das fontes:
   1. áudio oficial;
   2. gravações do falante;
   3. voz sintética aprovada no teste com o falante.

   O tutor só pronuncia texto aprovado pelo `CorpusGuard`, e a fala sintética leva selo e o botão "pronúncia estranha". A Web Speech API não é usada para emakhuwa.

9. **Dois cursos separados.** Inglês e emakhuwa têm sessão, streak e avatar próprios, como a gamificação por curso do ADR-002.

## Alternativas consideradas

| Opção                                             | Por que não                                                                                                                                                                      |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Corpus só no aparelho (Dexie), sem servidor       | Leitura mais conservadora dos termos, mas sem sincronizar entre os dois computadores e o celular, e com pacotes exportados à mão. O André preferiu o Supabase privado            |
| Coletor pelo servidor (v0.1)                      | Acessa o site por meio diferente do oferecido; os arquivos oficiais para download resolvem o mesmo problema                                                                      |
| Ajustar ("fine-tuning") um modelo para emakhuwa   | Caro e lento para um idioma com pouco dado; a pesquisa mostra que exemplos paralelos no contexto rendem mais. Fica como opção pós-v1 (modelo pequeno de tradução, no computador) |
| Laboratório chamando a IA pelo proxy `/api/tutor` | Exigiria o proxy pronto antes de começar e passaria lotes grandes pelo servidor; a chave local, isolada em `lab/`, é mais simples e não chega ao cliente                         |
| Tutor nunca falar emakhuwa (ADR-003)              | Deixaria a fala sem modelo de pronúncia nos trechos sem áudio oficial; a validação pelo falante controla o risco                                                                 |

## Consequências

- O `fases.json` troca as fases E0 a E5 antigas pelas fases E0 a E12, com o laboratório e a base do agente começando antes das telas.
- O `CLAUDE.md` ganha uma seção do módulo, com a exceção do laboratório.
- Migration da E1: tabelas da seção 12.5 do plano, o valor `'downloaded'` em `courses.audio`, o curso `vmw` semeado, o bucket privado e a dívida de `courseId` do ADR-002 paga antes de ativar o curso.
- A qualidade da fala e da conversa depende do falante (fase E8). Sem ele, as fases E9 e E10 ficam restritas.
