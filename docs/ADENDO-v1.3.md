# ADENDO v1.3 ao PLANEJAMENTO — Política de IA e voz: qualidade primeiro

> **Data:** 30/10/2026 · **Vale para:** Fluente365 (inglês) e módulo emakhuwa
> **Base:** `docs/PLANEJAMENTO.md` v1.2 e `docs/ADR-003-tutor-voz.md`

## Decisão (André, 29 e 30/10/2026)

Na v1, nenhuma meta de custo limita funcionalidades — nem de IA de texto, nem de voz. Cada serviço usa o modelo mais capaz onde houver ganho pedagógico, com todo o contexto que ajudar. O custo é **medido e visível**, não limitado. Nos primeiros meses de uso real, os números medidos decidem o que muda. Se ficar caro, reduz-se trocando modelo ou fornecedor por configuração, sem refazer código.

**Modelo:** Claude Opus 5.5 em todos os serviços de texto. O Fable 5.1 não é usado.

## O que muda no PLANEJAMENTO v1.2

| Onde                                       | Antes (v1.2)                                                                           | Agora (v1.3)                                                                                                                                               |
| ------------------------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cabeçalho                                  | Versão 1.2                                                                             | Versão 1.3, com a linha "v1.3: política de IA e voz qualidade primeiro (ver ADENDO-v1.3)"                                                                  |
| RNF03                                      | "rate limit por usuário no proxy de IA"                                                | Limite de segurança **alto** por usuário (ex.: 500 chamadas/dia), só contra loops e abuso — não é economia                                                 |
| RNF04                                      | Teto mensal; ≤ US$1,50/usuário para texto e ≤ US$1,50/usuário para voz                 | Qualidade primeiro; custo de texto e de voz medido por usuário e por serviço no painel; revisão depois dos primeiros meses de uso real                     |
| 9.2 (coluna "Modelo sugerido")             | Haiku nos serviços; Sonnet no ConversationTutor                                        | **Opus 5.5** em todos os serviços de texto (ContentGenerator em batch); modelo configurável por serviço (nova 14.2). Linha TutorVoice sem mudança          |
| 9.5 (1º item)                              | Rate limit de 40 chamadas/dia                                                          | Limite de segurança alto, o mesmo do RNF03                                                                                                                 |
| 9.6 (guard-rails)                          | Cota diária de fala do tutor na conversa: 10 min por aluno                             | Cota **alta** de segurança (ex.: 60 min/dia), só contra loops; não limita o uso normal                                                                     |
| 11.1 (linha IA)                            | "Haiku 4.5; Sonnet no modo conversa"                                                   | "Opus 5.5 por padrão; modelo configurável por serviço"                                                                                                     |
| 14.1 a 14.3                                | Preços Haiku 4.5/Sonnet; estimativa US$0,15-0,80; controles com teto                   | Substituídas pela **nova seção 14** abaixo                                                                                                                 |
| 14.4 (custos de voz)                       | Controles com cota diária de fala na conversa                                          | Mantida, trocando a cota pela cota alta de segurança                                                                                                       |
| 15, Fase 2, tarefa 1                       | "rate limit por usuário"                                                               | "limite de segurança contra loops"                                                                                                                         |
| 15, Fase 2, critério de aceite             | "custo medido por sessão dentro da estimativa da seção 14"                             | "custo medido e registrado por sessão e por serviço"                                                                                                       |
| 15, Fase 3, tarefa 4                       | "cota diária de fala"                                                                  | "cota alta de segurança de fala"                                                                                                                           |
| 15, Fase 5, tarefa 6                       | "conversa no Sonnet, resto no Haiku; ... ajuste dos limites diários e da cota de fala" | "modelo por serviço configurável (padrão Opus 5.5); medição do custo real de texto e voz; ajustes só depois dos primeiros meses"                           |
| 15, Fase 5, critério de aceite             | "custo do modo conversa (texto e voz) dentro das estimativas"                          | "custo do modo conversa (texto e voz) medido e visível no painel"                                                                                          |
| 15, Fase 6, critério de aceite             | "custo mensal real dentro do teto"                                                     | "custo mensal real medido e revisado com o André"                                                                                                          |
| 16, riscos 5 e 10                          | Mitigação com rate limit, cota e teto                                                  | Decisão consciente de qualidade primeiro; painel diário, alerta por e-mail, fusível contra bugs, kill-switch de IA e de voz; plano de redução da nova 14.6 |
| 17, operacionais                           | Texto ≤ US$1,50 e voz ≤ US$1,50 por usuário ativo/mês                                  | Custo de texto e de voz medido por usuário e por serviço, revisado todo mês                                                                                |
| ADR-003, "Custos de voz", parágrafo "Teto" | ≤ US$1,50 por aluno ativo/mês para voz                                                 | Substituído por uma nota apontando para este adendo; o resto do ADR-003 continua valendo                                                                   |

## Nova seção 14 — Custos de IA e de voz

### 14.1 Preços de referência de IA (outubro/2026 — conferir na página oficial antes de implementar)

| Modelo            | Entrada (US$/milhão de tokens)    | Saída (US$/milhão de tokens) | Uso                             |
| ----------------- | --------------------------------- | ---------------------------- | ------------------------------- |
| Claude Opus 5.5   | 4                                 | 20                           | **Padrão de todos os serviços** |
| Claude Sonnet 5.5 | 2                                 | 10                           | Reserva, se for preciso reduzir |
| Claude Haiku 5.5  | 0,10 (prompts até 100 mil tokens) | 0,50                         | Reserva, se for preciso reduzir |
| Claude Fable 5.1  | 10                                | 50                           | Não usado                       |

- **Prompt caching:** no Opus 5.5, a leitura de cache custa US$ 0,20 por milhão de tokens.
- **Batch API:** metade do preço — usar na pré-geração de lições e nos lotes do laboratório emakhuwa.
- Fonte consultada: tabela de preços da API Claude, out/2026 (https://claudecoworkcourse.com/ai-api-pricing/claude). Conferir em https://docs.claude.com antes de configurar.

### 14.2 Modelo por serviço (configuração, não código)

O proxy lê o modelo de cada serviço de um mapa de configuração no servidor (por exemplo, `src/infrastructure/anthropic/model-routing.ts` ou variáveis `AI_MODEL_<SERVIÇO>`). Trocar de modelo = mudar uma linha de configuração.

| Serviço                                         | Modelo           |
| ----------------------------------------------- | ---------------- |
| ContentGenerator                                | Opus 5.5 (batch) |
| WritingCoach                                    | Opus 5.5         |
| SpeechCoach                                     | Opus 5.5         |
| Remediator                                      | Opus 5.5         |
| PlacementAnalyzer                               | Opus 5.5         |
| ConversationTutor                               | Opus 5.5         |
| Serviços do módulo emakhuwa (app e laboratório) | Opus 5.5         |

### 14.3 Estimativa (ordem de grandeza — a medição dos primeiros meses substitui)

- **Inglês, IA de texto, Opus 5.5 em tudo:** cerca de US$ 2 a 4 por aluno ativo/mês; o modo conversa é perto da metade.
- **Inglês, voz (ADR-003):** cerca de US$ 1,05 a 1,40 por aluno/mês com a Fish Audio; US$ 2,80 a 3,15 com o ElevenLabs Flash.
- **Família de 15 alunos:** cerca de US$ 45 a 80 por mês com a Fish Audio.
- **Módulo emakhuwa (uso pessoal):** cerca de US$ 20 a 50 por mês de texto, US$ 1 a 3 por lote do laboratório e US$ 1 a 5 de voz.

### 14.4 Custos de voz

Mantém a seção 14.4 da v1.2, com uma troca: a "cota diária de fala na conversa" passa a ser uma cota alta de segurança (ex.: 60 min por aluno por dia), só para pegar loops.

### 14.5 Controles — visibilidade, não limite

1. Log de tokens, caracteres de voz e custo por chamada em `admin_costs`; painel com o custo do dia e do mês, por serviço, por usuário e por curso.
2. Alerta por e-mail quando o custo do dia passar de um valor que o André define — é aviso, não bloqueio.
3. **Fusível contra bugs:** limite de gasto no console da Anthropic bem acima do uso esperado (ex.: US$ 150/mês), mais os limites altos de chamadas e de fala por usuário/dia. Servem para pegar um loop ou erro de programação, não para economizar.
4. Kill-switches de IA e de voz mantidos para emergências.

### 14.6 Se ficar caro: como reduzir sem refazer nada

1. Trocar para Sonnet 5.5 ou Haiku 5.5 os serviços de menor impacto (SpeechCoach e PlacementAnalyzer primeiro).
2. Na voz, preferir a Fish Audio ao ElevenLabs e aumentar o que sai do cache.
3. Mais prompt caching e mais batch.
4. Menos exemplos de contexto por chamada.
5. Só por último: limites de uso por aluno.
