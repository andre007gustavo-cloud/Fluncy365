# ADR-006 — Laboratório pela assinatura e Opus revisando todo o alinhamento

- **Data:** 2026-10-30
- **Status:** Aceita. Altera o ADR-004 (item do laboratório chamando a API com chave) e o ADR-005 (custo do processamento).
- **Contexto:** a estimativa de processar o acervo pela API com o Opus era de uns US$ 200 para os primeiros 1.000 documentos, caro para uso pessoal. O André quer manter a qualidade máxima (Opus em tudo, revisão de todo o alinhamento, análise pelo sentido), e o uso pessoal permite rodar o laboratório pela assinatura Claude dele.

## Decisão

1. **Laboratório pelo Claude Agent SDK, logado na conta do André.** O processamento em lote consome o limite da assinatura. Não há `ANTHROPIC_API_KEY` em `lab/` na fase pessoal.
2. **Opus 5.5 em todas as tarefas do processamento.** Haiku e Sonnet não são usados.
3. **Código prepara, Opus revisa tudo.** Pré-pareamento de parágrafos e frases e contagem estatística por código; revisão de todos os pares de frases e análise das palavras no contexto da frase pelo Opus.
4. **Lotes com retomada.** Cada documento tem estado (a fazer, em andamento, pronto, erro). Quando o limite acaba, o laboratório pausa e retoma depois, sem refazer o que já foi feito.
5. **Sob demanda.** Ordem de processamento da seção de pipeline do plano; contagem estatística no acervo todo.
6. **App e worker na API.** O tutor ao vivo continua pelo `/api/tutor` com a chave no servidor. O worker da versão para convidados (ADR-005) usa a API só para o que não foi processado no laboratório.
7. **A porta de IA do laboratório é uma interface** (`LabAiPort`) com dois adaptadores: Agent SDK (padrão) e API. Trocar = configuração.

## Alternativas consideradas

| Opção                      | Por que não                                                              |
| -------------------------- | ------------------------------------------------------------------------ |
| API com o Opus em tudo     | Uns US$ 200 por 1.000 documentos; caro para uso pessoal                  |
| Haiku no trabalho mecânico | Modelos menores conhecem pouco do emakhuwa; risco de piorar o dicionário |
| Alinhamento só por código  | Perde traduções não literais e o sentido no contexto                     |

## Consequências

- Custo extra zero no processamento da fase pessoal; o preço é o tempo (dias ou semanas, em lotes).
- O limite da assinatura é dividido com o uso normal do André no Claude.
- O custo real por documento é medido na fase pessoal e usado para decidir o worker da versão para convidados.
