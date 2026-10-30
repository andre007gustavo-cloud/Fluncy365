# ADR-005 — Acervo do jw.org autorizado: coleta, biblioteca compartilhada e distribuição

- **Data:** 2026-10-30
- **Status:** Aceita. Vale nos limites registrados em `docs/autorizacao-jw.md`; condições da organização prevalecem sobre este ADR.

> **Alterado pelo [ADR-006](./ADR-006-laboratorio-com-assinatura.md):** o laboratório usa a assinatura pelo Claude Agent SDK, sem chave da API; a regra da `service_role` deste ADR continua valendo. No item 9, "as regras do ADR-004" vale com a exceção da chave: a `service_role` fica só em `lab/.env.local`, fora do Git, nunca no app; e a chave da API da Anthropic não fica no laboratório (ADR-006).

- **Contexto:** o ADR-004 desenhou o módulo emakhuwa para uso pessoal, com arquivos baixados à mão e corpus visível só ao André. Em 30/10/2026 o jw.org aprovou a proposta de coleta automática, biblioteca no servidor, distribuição gratuita e outros idiomas.

## Decisão

1. **Quatro partes independentes.** Coleta (A1), biblioteca compartilhada (A2), buscador e aulas automáticas (A3), distribuição (A4) e outros idiomas (A5). Cada uma só liga se o item correspondente estiver autorizado em `docs/autorizacao-jw.md`.
2. **Coletor por adaptador.** O importador do E2 vira uma porta (`CorpusSourcePort`) com dois adaptadores: importação manual (ADR-004) e coletor automático. O coletor usa o catálogo de arquivos públicos, pareia pelo número do documento e segue as regras de bom vizinho (seção 3 do plano). Não varre páginas HTML.
3. **Worker fora da Vercel.** Coleta e processamento em lote rodam num serviço agendado com fila. A chave da Anthropic e a `service_role` do Supabase ficam só nas variáveis de ambiente dele. O código do app continua chamando a IA só por `/api/tutor`.
4. **Biblioteca como conteúdo.** As tabelas do corpus seguem o padrão `content_*` do ADR-001: leitura para quem tem acesso ao curso, escrita só pela `service_role`. Contestações e respostas do falante ficam em tabelas com `user_id` que alimentam o status comum pelo `EvidenceScorer`.
5. **Visibilidade do curso.** O curso `vmw` nasce `owner_only` (só o André) e passa a `shared` por convite na fase A4. Um curso novo de outro idioma segue o mesmo caminho.
6. **Novas tabelas:** `catalog_items` (o que existe no site, por idioma e número do documento), `collector_runs` (o que foi coletado, quando e com que resultado) e `takedown_requests` (pedidos de retirada, com prazo de 7 dias).
7. **Salvaguardas em código:** atribuição em toda tela com conteúdo, aviso de app independente e não oficial, agente restrito à língua, `CorpusGuard` em toda frase exibida, relatório de coleta e uso exportável para a organização.
8. **Busca:** índice de texto no Postgres e, depois, índice semântico com pgvector.
9. **Laboratório mantido** para voz sintética, alinhamento forçado, reconhecimento de voz e ajuste fino opcional, com as regras do ADR-004.

## Alternativas consideradas

| Opção                                                | Por que não                                                                                   |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Continuar só com importação manual                   | A autorização permite economizar semanas de trabalho manual e abrir o módulo a outras pessoas |
| Coletor dentro das rotas da Vercel                   | Limite de tempo de execução; lotes longos precisam de um worker com fila                      |
| Varrer páginas HTML                                  | Desnecessário com o catálogo de arquivos públicos; mais carga no site e mais frágil           |
| Migrar o corpus de `owner_only` para `shared` depois | Evitado: as tabelas do E1 já nascem no padrão de conteúdo, e só a visibilidade do curso muda  |

## Consequências

- O `fases.json` ganha as fases A0 a A5, e as fases E1, E2 e E4 mudam para nascer prontas para a biblioteca compartilhada.
- O André ganha uma tarefa de operação: acompanhar o painel do coletor e responder pedidos de retirada.
- Se a organização restringir ou retirar a autorização, a parte afetada desliga por configuração e a importação manual continua.
