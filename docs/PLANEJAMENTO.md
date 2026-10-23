# FLUENTE365 — Planejamento Completo do Aplicativo

### App de inglês do zero ao avançado em 1 ano · 20 minutos por dia

> **Codinome do projeto:** Fluente365 (nome provisório — pode ser trocado a qualquer momento)
> **Versão do documento:** 1.2 · Outubro/2026
> **Alterações:**
>
> - **v1.2:** um **tutor animado com voz natural**, personagem separado do avatar do aluno, entra na v1. Ver [`ADR-003`](./ADR-003-tutor-voz.md). Afeta as seções 1, 3, 4, 6, 9, 10, 11, 12, 13, 14, 15, 16, 17 e 19. A Trilha de Imersão (RF11), que não tinha tarefa no roadmap, entrou na Fase 4.
> - **v1.1:** o banco de dados deixou de ser Firebase/Firestore e passou a ser **Supabase (PostgreSQL + Auth + Row Level Security)**. Ver [`ADR-001`](./ADR-001-banco-de-dados.md).
>
> **Uso deste documento:** fonte única de verdade do projeto. Deve viver em `/docs/PLANEJAMENTO.md` no repositório e ser referenciado pelo `CLAUDE.md` para orientar o Claude Code em todas as fases.

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Fundamentos pedagógicos](#2-fundamentos-pedagógicos)
3. [Público e requisitos](#3-público-e-requisitos)
4. [Funcionalidades completas](#4-funcionalidades-completas)
5. [Currículo de 12 meses](#5-currículo-de-12-meses)
6. [A sessão diária de 20 minutos](#6-a-sessão-diária-de-20-minutos)
7. [Nivelamento inicial (placement test)](#7-nivelamento-inicial)
8. [Motor adaptativo e modelo do aluno](#8-motor-adaptativo-e-modelo-do-aluno)
9. [Agente de IA: arquitetura completa](#9-agente-de-ia)
10. [Gamificação e avatar evolutivo](#10-gamificação-e-avatar)
11. [Arquitetura técnica](#11-arquitetura-técnica)
12. [Modelo de dados (PostgreSQL/Supabase)](#12-modelo-de-dados)
13. [Contratos de interface (SOLID)](#13-contratos-de-interface)
14. [Custos de IA e controle de gastos](#14-custos-de-ia)
15. [Roadmap detalhado — Fase 0 à Fase 6](#15-roadmap-detalhado)
16. [Riscos e mitigações](#16-riscos-e-mitigações)
17. [Métricas de sucesso](#17-métricas-de-sucesso)
18. [Como usar este documento com o Claude Code](#18-uso-com-claude-code)
19. [Backlog futuro (pós-v1)](#19-backlog-futuro)

---

## 1. Visão geral

### 1.1 O problema

Apps de idiomas populares mantêm o aluno em exercícios rasos e repetitivos, sem produção real (falar/escrever de verdade), sem profundidade gramatical e sem conexão com o material que a pessoa realmente vai usar. Cursos presenciais bons são caros e não cabem na rotina.

### 1.2 A proposta

Um tutor pessoal de inglês em forma de app: **20 minutos por dia, todos os dias, durante 1 ano**, levando o aluno do nível atual (inclusive zero absoluto) até o nível avançado possível dentro dessa carga, com:

- Currículo estruturado no padrão CEFR (A1 → C1), com a sequência gramatical consagrada dos livros de Raymond Murphy como espinha dorsal;
- Material real: leituras, áudios e vídeos das publicações do jw.org em inglês (texto paralelo inglês/português e áudio narrado profissional);
- Treino das 4 habilidades: leitura, escrita, escuta e fala;
- Um agente de IA (API da Anthropic) que gera conteúdo sob especificação rigorosa, corrige produção livre, remedia erros específicos do aluno e conversa com ele;
- Um **tutor animado com voz natural**, que explica as lições, comenta a produção e conversa com o aluno: um personagem próprio, separado do avatar do aluno (ver ADR-003);
- Progresso medido de verdade (domínio por tópico e por habilidade), com dificuldade que evolui junto com o aluno;
- Gamificação com propósito: avatar que evolui conforme o domínio comprovado, streak com proteção, relatórios semanais de progresso concreto.

### 1.3 Metas de aprendizado (honestas)

- 20 min/dia × 365 dias ≈ **120 horas de estudo ativo/ano**.
- Meta core: sair do zero e chegar a um **B1 sólido / B2 inicial** em 12 meses com o programa de 20 min.
- Meta estendida: o app oferece a **Trilha de Imersão** (opcional, fora dos 20 min): ouvir áudios no trânsito, assistir vídeos, ler artigos extras. Quem fizer 40-60 min/dia totais tem chance real de **B2 pleno / C1 inicial** em 1 ano. O app mede e recompensa a imersão extra (acelera o avatar).
- O app nunca promete milagre; ele mostra o progresso real e o caminho.

### 1.4 Princípios do produto

1. **Profundidade por especificação**: a IA nunca "inventa o curso"; ela executa um syllabus detalhado, versionado e revisado por humanos.
2. **Produção acima de reconhecimento**: o aluno escreve, fala e traduz ativamente todos os dias — múltipla escolha é diagnóstico, não aprendizado.
3. **Material real desde o dia 1**: todo conteúdo se ancora em textos/áudios autênticos do jw.org, no nível certo.
4. **Adaptativo de verdade**: o app conhece os erros específicos do aluno e ataca cada um.
5. **Hábito sustentável**: 20 minutos cabem em qualquer rotina; o design protege a constância (streak com escudos, sessão de resgate curta).
6. **Local-first e leve**: funciona offline no essencial; sincroniza quando há rede.

---

## 2. Fundamentos pedagógicos

Estes são os métodos que o app implementa — e que devem constar no system prompt do agente de IA:

| Método                          | O que é                                                                                       | Onde aparece no app                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Repetição espaçada (SRS)**    | Revisar itens em intervalos crescentes (1, 3, 7, 16, 35 dias...), no limiar do esquecimento   | Todo vocabulário, frase-modelo e estrutura aprendida vira cartão SRS; abertura de cada sessão |
| **Recall ativo**                | Produzir a resposta antes de vê-la (efeito de teste)                                          | Exercícios abertos (digitar, falar, traduzir) têm prioridade sobre fechados                   |
| **Input compreensível (i+1)**   | Consumir conteúdo ligeiramente acima do nível atual                                           | Seleção de trechos do jw.org calibrada pelo nível de leitura/escuta do aluno                  |
| **Output hypothesis**           | Produzir força a consolidação: escrever e falar revelam lacunas                               | Bloco diário de produção (escrita seg/qua/sex, fala ter/qui/sáb)                              |
| **Shadowing**                   | Ouvir e repetir imitando ritmo, entonação e pronúncia                                         | Modo shadowing com áudios curtos do jw.org                                                    |
| **Ditado**                      | Ouvir e transcrever; treina escuta fina e ortografia                                          | Exercício recorrente de listening com correção automática (diff)                              |
| **Interleaving**                | Misturar tópicos e habilidades na mesma sessão                                                | A sessão de 20 min sempre combina revisão + gramática + input + produção                      |
| **Currículo em espiral**        | Cada tópico retorna 2-3 vezes em profundidade crescente                                       | Present perfect: forma (B1) → contraste com past simple (B2) → nuances (C1)                   |
| **Mastery learning**            | Só avança quem domina (≥85%); quem trava recebe remediação, não repetição                     | Motor adaptativo (seção 8)                                                                    |
| **Feedback corretivo imediato** | Erro corrigido na hora, com explicação curta e recast                                         | Toda correção (determinística ou por IA) explica o porquê em 1-2 frases                       |
| **Aprendizado por frequência**  | Priorizar as palavras mais frequentes do idioma (as 2.000 mais comuns cobrem ~80% dos textos) | Listas de vocabulário do syllabus ordenadas por frequência + termos do jw.org                 |

**Erros típicos de falantes de português** (o syllabus e a IA devem atacá-los explicitamente): omissão do sujeito ("is raining" → "it is raining"); "have" para idade ("I have 20 years"); confusão make/do; "people is"; falta de auxiliar em perguntas ("You like coffee?"); pronúncia de -ed, th, h aspirado, vogais curtas/longas (ship/sheep); falsos cognatos (actually, pretend, push); ordem adjetivo-substantivo; preposições (depend **on**, married **to**).

---

## 3. Público e requisitos

### 3.1 Público

- **Usuários da v1:** família e amigos (~10-30 pessoas), falantes de português brasileiro, do zero absoluto ao intermediário, com interesse específico no inglês usado nas publicações do jw.org.
- **Dispositivos:** celulares Android (maioria) e iPhone; uso ocasional em desktop. Distribuição como **PWA** (sem lojas de aplicativos).

### 3.2 Requisitos funcionais (resumo)

- RF01 — Cadastro/login (e-mail e Google).
- RF02 — Nivelamento inicial por habilidade; possibilidade de refazer a cada 3 meses.
- RF03 — Sessão diária estruturada de 20 min, com progresso salvo a cada passo (retomável).
- RF04 — Sistema SRS completo (agendamento, revisão, estatísticas).
- RF05 — Exercícios fechados (múltipla escolha, lacuna, ordenar, associar, ditado) com correção determinística.
- RF06 — Exercícios abertos (escrita livre, tradução, fala) com correção por IA.
- RF07 — Player de leitura/áudio para conteúdo do jw.org referenciado por unidade.
- RF08 — Treino de fala: leitura em voz alta, shadowing e (fase 5) conversa com o tutor.
- RF09 — Motor adaptativo: domínio por tópico, remediação por erro, ajuste de dificuldade.
- RF10 — Avatar evolutivo, XP, streak com escudos, badges, relatório semanal.
- RF11 — Trilha de Imersão opcional (registro de atividades extras).
- RF12 — Notificações/lembretes de estudo.
- RF13 — Painel do administrador (você): custos de IA, conteúdo gerado para revisão, progresso dos usuários.
- RF14 — Tutor animado com voz natural: apresenta o app, explica a lição do dia, comenta a produção, faz o fechamento e conversa (fase 5), sempre com legenda e com opção de silenciar (ADR-003).

### 3.3 Requisitos não funcionais

- RNF01 — PWA instalável, Lighthouse PWA ≥ 90; carregamento inicial < 3s em 4G.
- RNF02 — Offline: revisões SRS e lições já baixadas funcionam sem rede; sincronização automática ao reconectar.
- RNF03 — Segurança: chaves da API da Anthropic e dos fornecedores de voz **apenas** no servidor (variável de ambiente na Vercel); Row Level Security por usuário em todas as tabelas; rate limit por usuário no proxy de IA.
- RNF04 — Custo: teto mensal configurável; meta ≤ US$1,50/usuário ativo/mês para IA de texto e ≤ US$1,50/usuário ativo/mês para voz (TTS + STT, ver ADR-003 e seção 14.4).
- RNF05 — Código: TypeScript estrito, Clean Architecture, princípios SOLID, cobertura de testes do domínio ≥ 80%.
- RNF06 — Acessibilidade básica (contraste AA, navegação por teclado, textos alternativos, legenda em toda fala do tutor).
- RNF07 — Privacidade: dados de progresso pertencem ao usuário; exportação e exclusão de conta disponíveis.

---

## 4. Funcionalidades completas

### 4.1 Onboarding

Boas-vindas (o tutor se apresenta, com voz e legenda) → explicação do método (1 tela) → nivelamento (seção 7) → escolha do horário de estudo e lembrete → apresentação do avatar do aluno no estágio inicial → primeira sessão.

### 4.2 Sessão diária (núcleo do app)

Detalhada na seção 6. Sempre retomável do ponto onde parou; se o dia ficou impossível, existe a **Sessão de Resgate** (5 min, só SRS) que preserva o streak com penalidade de XP reduzido.

### 4.3 Tipos de exercício

**Fechados (correção por código, custo zero):**

- Múltipla escolha (diagnóstico e leitura)
- Lacuna (gap-fill) com banco de palavras ou digitação livre com tolerância
- Ordenar palavras para formar frase (unscramble)
- Associar (palavra↔tradução, palavra↔imagem, pergunta↔resposta)
- Ditado (ouvir → digitar; correção por diff palavra a palavra)
- Verdadeiro/Falso sobre trecho lido/ouvido

**Abertos (correção por IA):**

- Escrita guiada (responder pergunta sobre o texto em 2-5 frases)
- Escrita livre (mini-redação semanal com rubrica)
- Tradução PT→EN de frases do dia a dia
- Leitura em voz alta (STT verifica inteligibilidade + IA comenta)
- Shadowing (auto-avaliação assistida: gravação lado a lado com o original)
- Resumo oral/escrito de um trecho (a partir do B1)
- Conversa com o tutor (a partir do B1, fase 5)

**Vídeo:** vídeos do jw.org com tarefa acoplada (assistir com legenda EN → perguntas; rever sem legenda → ditado de trecho-chave).

### 4.4 Conteúdo jw.org — como é usado

- O app **não copia nem armazena** as publicações; ele guarda **referências** (URL oficial, título, nível estimado, duração, tópicos) e abre/transmite o conteúdo da fonte oficial.
- Cada unidade do syllabus aponta 3-6 conteúdos curados compatíveis com o nível (artigos curtos, capítulos com áudio, vídeos com legenda).
- Os exercícios gerados pela IA se referem ao trecho que o aluno acabou de ler/ouvir (compreensão, vocabulário em contexto, reescrita), citando no máximo frases curtas para fins didáticos.
- Curadoria inicial manual (planilha de links por nível); depois, tela de administração para adicionar/reclassificar conteúdos.

### 4.5 Livros de Raymond Murphy — como são usados

- A **sequência de unidades** (Essential Grammar in Use → English Grammar in Use) define a ordem gramatical do syllabus — é o mapa, não o conteúdo.
- O app **não reproduz** explicações nem exercícios dos livros (direitos autorais). A IA gera explicações e exercícios **originais** no mesmo estilo: frases curtas, contexto cotidiano, progressão suave.
- Ao final de cada lição, o app sugere: "Para aprofundar no seu livro: Unidade X" — referência para quem possui o exemplar físico.

### 4.6 Trilha de Imersão (opcional)

Registro rápido de atividades extras (ouvi um áudio, li um artigo, assisti reunião em inglês) com tempo estimado. Gera XP de imersão, acelera a evolução do avatar e entra no relatório semanal. Sugestões automáticas baseadas no nível.

### 4.7 Relatórios e transparência de progresso

- Tela "Meu progresso": nível por habilidade, tópicos dominados/em curso, tamanho estimado do vocabulário, horas acumuladas.
- Relatório semanal (domingo): números concretos ("você leu 2.400 palavras em inglês, entendeu 78% sem tradução, dominou 2 tópicos novos").
- Marco trimestral: mini-teste de nivelamento para medir avanço objetivo no CEFR.

### 4.8 Administração (para você)

Painel simples: custo de IA e de voz por dia/usuário, fila de conteúdo gerado para revisão (aprovar/editar/apagar), progresso agregado dos usuários, curadoria de links jw.org.

### 4.9 O tutor animado

Personagem 2D com identidade fixa (nome e visual definidos no chat antes da Fase 4) que encarna a persona do system prompt (seção 9.1) com voz natural. Ele **não** é o avatar do aluno: o tutor ensina; o avatar mostra o progresso de quem aprende (seção 10). Decisão completa no [`ADR-003`](./ADR-003-tutor-voz.md).

- **Onde aparece:** apresenta o app no onboarding, explica a lição do dia, comenta a produção (escrita e fala), faz o fechamento e conversa no modo conversa (B1+, fase 5).
- **Como fala:** explicações e enunciados vêm de áudio em cache, gerado uma vez e igual para todos, que funciona offline depois de baixado. Feedback individual e conversa são sintetizados na hora.
- **Estados visuais:** parado, ouvindo, pensando, falando, comemorando e encorajando; a boca acompanha a fala.
- **Sempre com legenda.** O aluno pode silenciar o tutor e seguir tudo em texto.
- **Idiomas:** a mesma voz fala português (explicações para iniciantes) e inglês (exemplos e conversa).

---

## 5. Currículo de 12 meses

Mapeado no CEFR, com a sequência gramatical inspirada na progressão dos livros de Murphy e vocabulário por frequência + termos do jw.org. Cada mês tem 4 unidades semanais; cada unidade tem 6 lições diárias + 1 dia de revisão/avaliação.

| Mês | Nível   | Gramática (tópicos-alvo)                                                                                                      | Vocabulário (meta acumulada)               | Habilidades em foco                                                                        |
| --- | ------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| 1   | A1.1    | Alfabeto e sons do inglês, pronomes, verb to be (afirm./neg./perguntas), artigos a/an, this/that/these/those, there is/are    | 300 palavras (alta frequência + saudações) | Escuta de sons, leitura de frases, fala: apresentar-se                                     |
| 2   | A1.2    | Present simple (do/does), advérbios de frequência, possessivos, plural, imperativo, can/can't, question words                 | 600 palavras                               | Ditado simples, primeiras frases escritas, ler parágrafos curtos simplificados             |
| 3   | A2.1    | Past simple (regulares/irregulares essenciais), was/were, present continuous, present continuous vs simple                    | 1.000 palavras                             | Narrar o próprio dia (passado), escutar diálogos curtos                                    |
| 4   | A2.2    | Going to e will, countable/uncountable, some/any/much/many/a lot of, object pronouns, like/love/hate + -ing                   | 1.400 palavras                             | Primeiro artigo curto real do jw.org (nível fácil) com áudio; escrever 5 frases conectadas |
| 5   | A2.3→B1 | Comparativos e superlativos, advérbios de modo, preposições de tempo/lugar, verbos frasais básicos (get up, look for...)      | 1.800 palavras                             | Shadowing de frases; resumo oral de 3 frases                                               |
| 6   | B1.1    | Present perfect (just/already/yet; for/since), present perfect vs past simple (1ª passada)                                    | 2.200 palavras                             | Artigos completos curtos; ditado de trechos de áudio real                                  |
| 7   | B1.2    | Past continuous, used to, first conditional, modais: should/must/have to/might                                                | 2.600 palavras                             | Escrita: parágrafo de opinião; escuta de vídeo com legenda EN                              |
| 8   | B1.3    | Second conditional, voz passiva (presente/passado), relative clauses (who/which/that)                                         | 3.100 palavras                             | Conversa com o tutor (texto); vídeo sem legenda PT                                         |
| 9   | B2.1    | Gerúndio vs infinitivo, reported speech (statements), past perfect, phrasal verbs (expansão)                                  | 3.600 palavras                             | Resumo escrito de artigo; conversa por voz curta                                           |
| 10  | B2.2    | Third conditional e mistos, passiva em todos os tempos, reported speech (perguntas/pedidos), wish                             | 4.200 palavras                             | Escrita: texto de 120-150 palavras; escuta de discursos em velocidade natural              |
| 11  | B2.3→C1 | Conectivos avançados (although, despite, however...), causative (have something done), collocations, registro formal/informal | 4.800 palavras                             | Present perfect/condicionais em espiral (nuances); debate leve com o tutor                 |
| 12  | C1.1    | Inversão (Not only...), cleft sentences, discourse markers, modalidade avançada, expressões idiomáticas frequentes            | 5.500 palavras                             | Fluência: resumo oral de 1 min, leitura de artigos longos, escrita de 200 palavras         |

**Regras do currículo:**

- **Espiral obrigatória:** os tópicos críticos (present perfect, condicionais, passiva, preposições) reaparecem 2-3 meses depois em profundidade maior — o syllabus já marca essas revisitas.
- **Vocabulário:** 60% lista de frequência geral + 40% termos recorrentes das publicações do jw.org no nível (extraídos na curadoria).
- **Quem começa acima do A1** entra no mês correspondente ao seu nivelamento, por habilidade (ex.: leitura no mês 6, fala no mês 3 — trilhas dessincronizadas de propósito).
- O syllabus detalhado (documento separado, `content/syllabus/`) especifica por unidade: objetivos, estruturas-alvo com exemplos, lista exata de vocabulário, erros PT-BR a atacar, conteúdos jw.org sugeridos, critérios de domínio e a unidade correspondente no livro do Murphy.

---

## 6. A sessão diária de 20 minutos

Estrutura fixa com conteúdo variável (interleaving). O cronômetro é orientativo; blocos têm limites para a sessão não estourar.

| Minutos | Bloco               | Conteúdo                                                                                                                                                                    | Correção                 |
| ------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 0-3     | **Aquecimento SRS** | Revisões vencidas do dia (máx. 20 cartões; excedente vai para a fila)                                                                                                       | Determinística           |
| 3-8     | **Lição do dia**    | Micro-explicação do tópico gramatical (3-5 frases + 2 exemplos), narrada pelo tutor com legenda, e 4-6 exercícios de produção sobre ele                                     | Determinística           |
| 8-15    | **Input real**      | Trecho de artigo/áudio/vídeo do jw.org no nível; tarefa acoplada (compreensão, ditado ou shadowing)                                                                         | Determinística + IA leve |
| 15-19   | **Produção**        | Seg/Qua/Sex: escrita (2-5 frases sobre o input). Ter/Qui/Sáb: fala (leitura em voz alta ou shadowing avaliado; B1+: mini-conversa com o tutor); o tutor comenta o resultado | IA                       |
| 19-20   | **Fechamento**      | O tutor resume o dia: o que entrou no SRS, XP, evolução do avatar do aluno, prévia de amanhã                                                                                | —                        |

**O tutor na sessão:** ele narra a explicação da lição, comenta a produção e faz o fechamento. Com o tutor silenciado, tudo aparece só em texto; nenhuma parte da sessão depende da voz.

**Domingo:** sessão especial de revisão — SRS estendido + quiz da semana (10 questões dos tópicos recentes) + relatório semanal. Sem conteúdo novo.

**Ritmo semanal de uma unidade:** 6 lições (seg-sáb) cobrem o tópico da semana em passos crescentes; o quiz de domingo mede o domínio e alimenta o motor adaptativo.

---

## 7. Nivelamento inicial

Objetivo: colocar cada habilidade no ponto certo do currículo em 15-20 minutos, uma única vez (refazível a cada trimestre como marco de progresso).

| Etapa                   | Duração | Mecânica                                                                                                                                                                                              | Correção                                  |
| ----------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 1. Vocabulário          | 3 min   | Teste sim/não: "você conhece esta palavra?" com ~60 palavras ordenadas por frequência + 8 pseudo-palavras para detectar chute. Estima o tamanho do vocabulário (ajustado pela taxa de falso-positivo) | Código                                    |
| 2. Gramática adaptativa | 5 min   | Banco de ~120 itens calibrados por dificuldade (A1→C1). Lógica de escada: acertou sobe, errou desce; converge em ~15 questões                                                                         | Código                                    |
| 3. Listening            | 4 min   | 3 áudios curtos (A2/B1/B2) com 2 perguntas cada; para quando o desempenho cai abaixo de 50%                                                                                                           | Código                                    |
| 4. Escrita              | 3 min   | "Escreva 3-5 frases sobre seu dia" (pulável para iniciantes absolutos)                                                                                                                                | IA estima CEFR + aponta 3 características |
| 5. Fala (opcional)      | 2 min   | Ler 2 frases em voz alta; STT verifica inteligibilidade                                                                                                                                               | Código + IA leve                          |

**Saída:** perfil `{ reading: B1, listening: A2, writing: A2, speaking: A1, vocabSize: 1900 }` → cada trilha começa no mês correspondente.

**Atalho "zero absoluto":** botão "Nunca estudei inglês" pula tudo e começa no Mês 1.

**Nivelamento provisório:** nas 2 primeiras semanas o motor adaptativo corrige a estimativa com peso dobrado (teste nenhum é perfeito; o comportamento real refina).

---

## 8. Motor adaptativo e modelo do aluno

O coração da personalização. É **determinístico** (regras + estatística simples) — a IA consome o modelo do aluno, não o calcula.

### 8.1 O modelo do aluno (StudentModel)

Mantido no Supabase e espelhado localmente:

- `levels`: nível CEFR contínuo por habilidade (ex.: reading 2.4 ≈ A2.4) — escala interna 1.0 (A1.0) a 6.0 (C2.0).
- `topicMastery`: por tópico gramatical → `{ accuracy, attempts, sessions, lastSeen, status: locked|learning|review|mastered }`.
- `vocab`: estado SRS de cada palavra/frase (ease, intervalo, próxima revisão, lapsos).
- `errorLog`: erros específicos com classificação (ex.: `aux_do_missing`, `make_do_confusion`, `ed_pronunciation`) + exemplo + contagem + última ocorrência.
- `pace`: tempo médio por exercício, taxa de conclusão de sessões, horário habitual.

### 8.2 Regras de domínio (mastery)

- Tópico **dominado**: acurácia ≥ 85% em ≥ 12 exercícios distribuídos em ≥ 3 sessões com ≥ 2 dias de intervalo.
- Tópico **em dificuldade**: acurácia < 60% após 2 sessões → dispara **remediação**: a IA gera uma mini-lição com abordagem diferente (mais exemplos, contraste explícito com o português, exercícios mais graduais) + o tópico ganha peso extra no SRS.
- Dominado não morre: entra no ciclo de revisão espaçada de tópicos (reaparece em exercícios mistos em 7, 21, 60 dias).

### 8.3 Ajuste de dificuldade

- Cada exercício tem dificuldade estimada (1-10). Um Elo simplificado por habilidade casa aluno↔exercício: acertos contra itens difíceis sobem o rating mais rápido; a seleção busca a faixa de ~70-85% de acerto esperado (zona de desafio produtivo).
- Sequência de 3 sessões "fáceis demais" (≥ 95%) → o planner pula lições opcionais e antecipa a próxima unidade; o app avisa: "Você está voando — acelerei seu plano."

### 8.4 SRS (algoritmo)

- Base **SM-2 adaptado**: qualidade da resposta 0-5 → ajusta ease factor (mín. 1,3) e intervalo (1 → 3 → 7 → ~16 → ~35 dias × ease). Lapso reinicia intervalo com ease reduzido.
- Respostas de exercícios abertos também alimentam o SRS: palavra usada corretamente em produção livre conta como revisão bem-sucedida (sinal forte).
- Teto diário de 20 revisões na sessão core; excedente vai para fila opcional "revisão extra" (conta como imersão).

### 8.5 O planner de sessão (GenerateDailySession)

Caso de uso central. Entradas: StudentModel + syllabus + calendário. Saída: a sessão do dia (lista ordenada de atividades com fontes). Prioridades: 1) revisões SRS vencidas; 2) remediações pendentes; 3) próxima lição da unidade corrente por habilidade; 4) input real no nível; 5) produção do dia. Tudo logado para auditoria ("por que o app escolheu isso?").

---

## 9. Agente de IA

### 9.1 Princípio: especificação executada, não improviso

O agente **não é um modelo treinado** — é a API da Anthropic orquestrada por engenharia de prompt rigorosa. Cada chamada recebe três camadas de contexto:

1. **System prompt do tutor** (fixo, versionado no repo): persona de professor experiente para brasileiros; os métodos da seção 2; regras de estilo (frases curtas no estilo Murphy, contexto cotidiano e do jw.org, explicações de no máximo 5 frases, sempre contrastar com o português quando ajudar); formato de saída **JSON estrito** validado por schema.
2. **Spec da unidade** (do syllabus): objetivos, estruturas-alvo, vocabulário exato, erros a atacar, conteúdo jw.org da vez.
3. **Perfil do aluno** (compacto): níveis, últimos erros, palavras fracas, o que já foi dominado.

### 9.2 Os serviços de IA e de voz

| Serviço                       | Quando roda                                    | Modelo sugerido                                              | Cache/compartilhado?                                                          |
| ----------------------------- | ---------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **ContentGenerator**          | 1ª vez que qualquer aluno chega a uma lição    | Haiku (batch quando possível)                                | ✅ Salvo no Supabase, reusado por todos                                       |
| **WritingCoach**              | Correção de escrita livre                      | Haiku                                                        | ❌ individual (chamada curta)                                                 |
| **SpeechCoach**               | Feedback sobre transcrição da fala             | Haiku                                                        | ❌ individual                                                                 |
| **Remediator**                | Tópico em dificuldade → mini-lição alternativa | Haiku                                                        | Parcial (por tipo de erro, reusável)                                          |
| **PlacementAnalyzer**         | Análise da escrita/fala no nivelamento         | Haiku                                                        | ❌ individual                                                                 |
| **ConversationTutor**         | Modo conversa (fase 5)                         | Sonnet (qualidade de diálogo)                                | ❌ individual                                                                 |
| **TutorVoice** (voz, ADR-003) | Toda fala do tutor                             | Fish Audio (padrão) ou ElevenLabs; não é modelo de linguagem | ✅ Texto fixo em cache, reusado por todos; ❌ feedback e conversa individuais |

### 9.3 Pipeline de geração de conteúdo (gerar → validar → curar → reusar)

1. Aluno chega à lição X sem conteúdo no banco → proxy chama ContentGenerator com as 3 camadas.
2. Resposta JSON é validada por **schema (zod)**: estrutura, quantidade de exercícios, presença de gabarito e explicação. Falhou → retry com mensagem de erro; falhou 2× → fallback para lição estática de reserva + alerta no painel.
3. **Validação pedagógica automática**: gabarito de exercícios fechados é conferido (ex.: a resposta existe entre as opções; lacuna tem exatamente 1 resposta ou lista de aceitas).
4. Salvo em `content/lessons` com `status: "auto"` → entra na fila de revisão do painel admin (você aprova, edita ou apaga; itens `auto` já são servidos, mas sinalizados internamente).
5. Próximos alunos na mesma lição recebem do banco — custo marginal zero.

### 9.4 Correção de escrita (WritingCoach) — formato de saída

JSON: nota da rubrica (conteúdo/gramática/vocabulário 0-5), lista de erros `{ trecho, tipo, correção, explicação de 1 frase }`, versão corrigida completa, 1 elogio específico, 1 próximo passo, itens sugeridos para o SRS (palavra/estrutura que faltou). A UI apresenta isso de forma amigável, erro a erro.

### 9.5 Guard-rails

- Toda chamada passa pelo proxy `/api/tutor` (nunca do cliente direto): valida a sessão do Supabase, aplica rate limit por usuário (ex.: 40 chamadas/dia), registra tokens e custo, injeta o system prompt do servidor (o cliente nunca envia prompt de sistema).
- Prompt caching ativado para o system prompt + spec (entrada repetida ~90% mais barata).
- Temperatura baixa (0.3-0.5) para geração de exercícios; validação por schema em tudo.
- Nenhum dado sensível do aluno vai para a IA além do necessário pedagógico (apelido, níveis, erros).

### 9.6 Voz do tutor (ADR-003)

- **Fluxo:** texto a ser falado (explicação, feedback ou turno de conversa) → proxy `/api/voz` → procura no cache (`tutor_audio_cache`; chave = hash de texto + idioma + voz + modelo) → se não houver, sintetiza no fornecedor configurado e salva no Supabase Storage → o cliente toca o áudio e anima a boca.
- **Fornecedores atrás do `VoicePort`:** Fish Audio (padrão), ElevenLabs (alternativa) e Web Speech (reserva gratuita, offline e kill-switch). Trocar de fornecedor é configuração, não código.
- **Guard-rails:** sessão do Supabase verificada; cota diária de fala do tutor na conversa (padrão 10 min por aluno; esgotada, a conversa segue em texto); caracteres e custo registrados em `admin_costs`; chaves só no servidor.
- **Escuta do aluno (STT):** Web Speech onde existir; no iPhone e em falhas, o áudio vai ao proxy para transcrição pela API do fornecedor.
- **Modo conversa falável:** o prompt do ConversationTutor exige turnos de 1 a 3 frases, sem listas, marcação ou emojis, para soar natural em voz.

---

## 10. Gamificação e avatar

### 10.1 Avatar evolutivo — regras

- **O avatar não é o tutor.** O avatar representa o aluno e evolui com ele; o tutor (seção 4.9) é o professor, tem identidade fixa e é quem fala.
- **Evolui por domínio comprovado, nunca por tempo de tela**: XP de evolução vem de tópicos masterizados, palavras consolidadas no SRS (intervalo ≥ 21 dias) e marcos de habilidade.
- **7 estágios visuais** ligados ao CEFR: Semente (início) → Broto (A1) → Explorador (A2) → Viajante (B1) → Comunicador (B2) → Orador (C1) → Mestre (C2, aspiracional). Cada estágio muda visivelmente o personagem.
- **Habilidades do avatar espelham as do aluno**: ao atingir B1 de fala, o avatar "ganha voz" (uma animação simbólica: ele não fala de verdade) e desbloqueia o modo conversa com o tutor; ao dominar 1.000 palavras, ganha a "mochila de palavras"; leitura B2 desbloqueia os "óculos de leitor".
- Implementação visual: personagem em **SVG por camadas** (corpo, roupa, acessórios, aura) — barato de produzir, animável com CSS/Framer Motion, e novos acessórios são só novas camadas.

### 10.2 Economia de XP

- XP diário: sessão completa (100), exercícios de produção (bônus por dificuldade), imersão extra (até 50/dia).
- XP de evolução (o que sobe o avatar): tópico masterizado (250), unidade concluída (150), marco de vocabulário (500 a cada 500 palavras), marco trimestral de CEFR (1.000).
- Anti-farm: repetição do mesmo exercício não dá XP; só primeira conclusão e revisões agendadas pontuam.

### 10.3 Streak e proteção

- Streak diário com **2 escudos/mês** (não acumuláveis): um dia perdido consome escudo automaticamente.
- Sessão de Resgate (5 min de SRS) mantém o streak em dia impossível.
- Aviso gentil às 20h (configurável) se a sessão não foi feita.

### 10.4 Social leve (família e amigos)

- Mural opcional da "turma": streaks e estágios de avatar dos amigos (sem notas, sem ranking de acertos — comparação de constância, não de desempenho).
- Aplausos: reagir ao marco de um amigo.

---

## 11. Arquitetura técnica

### 11.1 Stack

| Camada       | Escolha                                                                                                                                                 | Por quê                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Front + PWA  | **Next.js 14+ (App Router) + TypeScript estrito + Tailwind**                                                                                            | Você já domina o ecossistema; PWA instalável; deploy trivial na Vercel                                            |
| PWA/offline  | Serwist (service worker) + **IndexedDB via Dexie**                                                                                                      | Sessões e SRS offline; sync ao reconectar                                                                         |
| Estado       | Zustand (UI) + camada de casos de uso própria                                                                                                           | Simples, testável                                                                                                 |
| Backend      | **API Routes da Vercel** (proxy de IA + webhooks)                                                                                                       | Sem servidor próprio; chave protegida em env var                                                                  |
| Auth + Banco | **Supabase (Auth + PostgreSQL)**                                                                                                                        | Substitui Auth e banco num só produto; Row Level Security por usuário; SQL para as consultas do SRS (ver ADR-001) |
| IA           | **API Anthropic** (Haiku 4.5; Sonnet no modo conversa)                                                                                                  | Custo/qualidade; ver seção 14                                                                                     |
| Voz          | **`VoicePort`**: Fish Audio (padrão), ElevenLabs (alternativa), Web Speech (reserva gratuita e offline). STT: Web Speech + transcrição via proxy no iOS | Voz natural do tutor com custo controlado por cache; troca de fornecedor por configuração (ADR-003)               |
| Animação     | Framer Motion + SVG em camadas                                                                                                                          | Avatar do aluno, tutor com boca sincronizada pela amplitude do áudio e micro-interações                           |
| Testes       | Vitest (domínio/aplicação) + Playwright (E2E)                                                                                                           | Cobertura exigida no RNF05                                                                                        |
| Qualidade    | ESLint + Prettier + Husky (pre-commit) + CI no GitHub Actions                                                                                           | Padrão em todo commit                                                                                             |

### 11.2 Clean Architecture — estrutura de pastas

```
src/
  domain/                  # Zero dependências externas. Puro TS.
    entities/              # Student, SrsCard, Exercise, Lesson, Session, Avatar, Streak, Tutor
    value-objects/         # CefrLevel, Skill, Difficulty, XP
    services/              # SrsScheduler, MasteryEvaluator, EloMatcher (lógica pura)
    ports/                 # Interfaces: AiTutorPort, ContentRepositoryPort,
                           #   StudentRepositoryPort, SpeechPort (ouvir), VoicePort (falar), ClockPort
  application/             # Casos de uso (1 arquivo = 1 caso de uso)
    generate-daily-session.ts
    evaluate-answer.ts
    complete-session.ts
    run-placement-test.ts
    request-writing-feedback.ts
    update-student-model.ts
    schedule-srs-reviews.ts
    evolve-avatar.ts
    get-tutor-speech.ts    # fala do tutor: cache local → /api/voz → fornecedor
  infrastructure/          # Implementações dos ports
    supabase/              # SupabaseStudentRepository, SupabaseContentRepository
    anthropic/             # AnthropicAiTutor (via /api/tutor)
    speech/                # WebSpeechAdapter, MediaRecorderAdapter
    voice/                 # FishAudioVoice, ElevenLabsVoice, WebSpeechVoice
    local/                 # DexieLocalStore, SyncEngine
  presentation/            # React. Não conhece infrastructure diretamente.
    app/                   # rotas Next (App Router)
    components/            # UI (session player, exercícios, avatar, tutor, dashboards)
    hooks/                 # useSession, useSrs, useAvatar, useTutor
  api/ (app/api/...)       # Proxies de IA (/api/tutor) e de voz (/api/voz), cron do relatório semanal
content/
  syllabus/                # Specs das unidades (JSON/MD versionados)
  seed/                    # Lições manuais da Fase 1 (A1, 4 semanas)
docs/
  PLANEJAMENTO.md          # Este documento
  ADR-*.md                 # Decisões de arquitetura (ADR-001 banco, ADR-003 tutor e voz)
CLAUDE.md                  # Convenções para o Claude Code
```

### 11.3 SOLID aplicado (regras de ouro do projeto)

- **S**: cada caso de uso faz uma coisa; componentes de UI não contêm regra de negócio.
- **O**: novo tipo de exercício = nova classe que implementa `Exercise` + novo renderer registrado; o session player e o avaliador não mudam.
- **L**: qualquer `ExerciseEvaluator` é substituível sem quebrar o fluxo (determinístico e IA obedecem ao mesmo contrato de resultado).
- **I**: ports pequenos e específicos (`SpeechPort` só ouve e `VoicePort` só fala, e nenhum dos dois sabe de IA; `AiTutorPort` não sabe de banco de dados).
- **D**: `domain` e `application` dependem só de interfaces; `infrastructure` injeta implementações na borda (composition root em `src/di.ts`).

### 11.4 Fluxos críticos

**Sessão diária:** app abre → SyncEngine puxa StudentModel → `generate-daily-session` monta o plano (local) → player executa atividade a atividade → `evaluate-answer` (determinístico local; abertos vão ao proxy) → `complete-session` grava resultados, atualiza SRS/mastery/XP → sync.

**Conteúdo:** player pede lição → ContentRepository busca no Supabase → não existe → proxy gera (seção 9.3) → salva → serve.

**Fala do tutor:** componente pede a fala → `get-tutor-speech` → cache local (lições baixadas) → proxy `/api/voz` → cache no Supabase Storage → fornecedor → o áudio toca e a boca do tutor acompanha a amplitude.

**Segurança do proxy:** request com cookie de sessão do Supabase → verificação com `supabase.auth.getUser()` → rate limit (contador em tabela Postgres) → chamada Anthropic com system prompt do servidor → log de tokens/custo → resposta validada → cliente.

---

## 12. Modelo de dados (PostgreSQL/Supabase)

> **Mudança em relação à v1.0 do documento:** o banco é PostgreSQL no Supabase, não Firestore.
> A justificativa, as alternativas descartadas e o mapa de tradução documento→tabela estão em
> [`ADR-001`](./ADR-001-banco-de-dados.md). O schema executável é
> `supabase/migrations/0001_initial_schema.sql` — ele é a fonte de verdade; a tabela abaixo é o resumo.

| Tabela              | Chave                                         | Conteúdo                                                                                                             |
| ------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `profiles`          | `id` (= `auth.users.id`)                      | nome, `settings` (horário do lembrete, tutor com voz ou silenciado), datas                                           |
| `student_models`    | `user_id`                                     | `levels` por habilidade, `vocab_size`, `pace`                                                                        |
| `topic_mastery`     | `user_id + topic_id`                          | `accuracy`, `attempts`, `sessions`, `last_seen`, `status`                                                            |
| `srs_cards`         | `id`                                          | `front`, `back`, `type`, `ease`, `interval_days`, `due_at`, `lapses`, `source_lesson_id`                             |
| `error_log`         | `user_id + code`                              | `skill`, `example`, `count`, `last_at`                                                                               |
| `study_sessions`    | `user_id + day`                               | `plan`, `results`, `xp`, `duration_sec`, `completed`, `rescue`                                                       |
| `gamification`      | `user_id`                                     | `xp_total`, `evolution_xp`, `avatar_stage`, `unlocked_traits`, `streak`                                              |
| `content_units`     | `id`                                          | espelho do syllabus: tópicos, vocabulário, erros PT-BR alvo, refs, critérios                                         |
| `content_lessons`   | `id`                                          | `blocks`, `exercises`, `status` (`seed`/`auto`/`approved`), `version`                                                |
| `content_jw_refs`   | `id`                                          | `url`, `title`, `type`, `level`, `minutes`, `topics`                                                                 |
| `admin_costs`       | `day`                                         | `calls`, tokens de entrada/saída, caracteres de voz, `usd`, `by_service` (inclui `tts` e `stt`)                      |
| `tutor_audio_cache` | `key` (hash de texto + idioma + voz + modelo) | `storage_path`, `lang`, `voice_id`, `provider`, `chars`, `duration_ms`, `word_timings` (quando houver), `created_at` |

Índice quente: `srs_cards (user_id, due_at)` — atende diretamente a consulta de abertura de toda
sessão ("meus cartões vencidos, do mais antigo primeiro").

**Regras de segurança (essência):** RLS ligada em **todas** as tabelas. Dados de aluno usam a policy
`auth.uid() = user_id` para SELECT/INSERT/UPDATE/DELETE. As tabelas `content_*` são legíveis por
qualquer autenticado e **não têm policy de escrita** — só a `service_role` (o proxy) grava. A `tutor_audio_cache` segue a mesma regra.
`admin_costs` exige o claim `admin` no JWT.

---

## 13. Contratos de interface (SOLID)

Os contratos centrais que o Claude Code deve implementar primeiro (versões completas serão refinadas na Fase 1):

```ts
// domain/value-objects
export type Skill = "reading" | "listening" | "writing" | "speaking";
export type CefrLevel = number; // 1.0 (A1.0) .. 6.0 (C2.0)

// domain/entities/exercise.ts
export interface Exercise {
  id: string;
  kind:
    | "multiple_choice"
    | "gap_fill"
    | "reorder"
    | "match"
    | "dictation"
    | "open_writing"
    | "translation"
    | "read_aloud";
  skill: Skill;
  difficulty: number; // 1..10
  prompt: ExercisePrompt; // texto/áudio/vídeo-ref
  answerSpec: AnswerSpec; // gabarito p/ determinísticos; rubrica p/ abertos
  srsItems: string[]; // itens que este exercício reforça
}

export interface EvaluationResult {
  correct: boolean | null; // null = avaliação qualitativa (abertos)
  score: number; // 0..1
  feedback: FeedbackItem[]; // explicações curtas, erro a erro
  srsSignal: { itemId: string; quality: 0 | 1 | 2 | 3 | 4 | 5 }[];
  errorCodes: string[]; // alimenta o errorLog
}

// domain/ports/exercise-evaluator.ts  (L: determinístico e IA são intercambiáveis)
export interface ExerciseEvaluator {
  supports(kind: Exercise["kind"]): boolean;
  evaluate(ex: Exercise, answer: UserAnswer): Promise<EvaluationResult>;
}

// domain/ports/ai-tutor.port.ts  (D: o domínio só conhece esta interface)
export interface AiTutorPort {
  generateLesson(spec: UnitSpec, profile: StudentSnapshot): Promise<Lesson>;
  reviewWriting(input: WritingSubmission): Promise<WritingFeedback>;
  coachSpeech(input: SpeechSubmission): Promise<SpeechFeedback>;
  remediate(topic: TopicId, errors: ErrorSummary): Promise<Lesson>;
  converse(state: ConversationState, userTurn: string): Promise<TutorTurn>;
}

// domain/services/srs-scheduler.ts (puro, 100% testável)
export interface SrsScheduler {
  review(card: SrsCard, quality: 0 | 1 | 2 | 3 | 4 | 5, today: Date): SrsCard;
  dueCards(cards: SrsCard[], today: Date, limit: number): SrsCard[];
}

// application/generate-daily-session.ts
export interface GenerateDailySession {
  execute(uid: string, date: Date): Promise<SessionPlan>;
}

// domain/ports/voice.port.ts  (I: só fala; não sabe de IA nem de banco — ADR-003)
export interface VoicePort {
  synthesize(req: SpeechRequest): Promise<SynthesizedSpeech>;
  stream(req: SpeechRequest): AsyncIterable<SpeechChunk>; // modo conversa
}

export interface SpeechRequest {
  text: string;
  lang: "pt-BR" | "en-US";
  voiceId: string; // voz do tutor (configuração)
  cacheable: boolean; // texto fixo → cache compartilhado
}

export interface SynthesizedSpeech {
  audioUrl: string; // Storage (cache) ou blob local
  durationMs: number;
  wordTimings?: { word: string; startMs: number; endMs: number }[]; // quando o fornecedor devolve
  provider: "fish" | "elevenlabs" | "webspeech";
  chars: number; // para o log de custo
}

// domain/entities/tutor.ts
export type TutorState =
  "idle" | "listening" | "thinking" | "speaking" | "celebrating" | "encouraging";
export type MouthShape = "rest" | "A" | "E" | "O" | "U" | "MBP" | "FV"; // 6 formatos + repouso
```

---

## 14. Custos de IA

### 14.1 Preços de referência (verificar sempre a página oficial de preços da Anthropic)

- Haiku 4.5: ~US$1 / US$5 por milhão de tokens (entrada/saída).
- Sonnet: ~US$3 / US$15 por milhão (só no modo conversa).
- **Prompt caching**: entrada repetida (system prompt + spec) custa ~10% do normal.
- **Batch API**: 50% de desconto — usar na pré-geração de lições.

### 14.2 Estimativa por usuário ativo/mês (arquitetura desta spec)

| Uso                                   | Volume mensal estimado                      | Custo aprox. (Haiku)                                  |
| ------------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| Correção de escrita (3×/sem)          | ~13 chamadas × 1,5k in + 0,6k out           | ~US$0,06                                              |
| Feedback de fala (3×/sem)             | ~13 × 0,8k in + 0,3k out                    | ~US$0,03                                              |
| Remediações                           | ~6 × 2k in + 1,5k out                       | ~US$0,06                                              |
| Geração de lições (rateada, cacheada) | compartilhada entre todos                   | ~US$0,02                                              |
| Modo conversa (B1+, Sonnet)           | ~12 sessões × 12k in (com caching) + 2k out | ~US$0,60                                              |
| **Total**                             |                                             | **~US$0,15 (sem conversa) a ~US$0,80 (com conversa)** |

Para 15 usuários da família: **~US$5-12/mês** só de IA de texto. Margem de segurança do RNF04 (US$1,50/usuário) coberta com folga. A voz do tutor é calculada à parte, na seção 14.4.

### 14.3 Controles obrigatórios

1. Log de tokens/custo por chamada em `admin/costs` (painel mostra custo do dia/mês).
2. Rate limit por usuário no proxy (padrão: 40 chamadas de IA/dia).
3. Teto mensal de gasto no console da Anthropic + crédito pré-pago (começar com US$5).
4. Alerta por e-mail (cron Vercel) se o custo diário passar do limiar configurado.
5. Kill-switch: flag em tabela de configuração desliga serviços de IA não essenciais mantendo o app funcional (conteúdo cacheado + exercícios determinísticos).
6. Voz: cota diária de fala do tutor na conversa e kill-switch próprio, que troca os fornecedores pagos pela Web Speech (seção 14.4).

### 14.4 Custos de voz (ADR-003)

Preços de outubro/2026 (verificar sempre as páginas oficiais). Conversão: 1 minuto de fala ≈ 1.000 caracteres.

| Uso por aluno ativo/mês           | Volume estimado                        | Fish Audio          | ElevenLabs Flash    |
| --------------------------------- | -------------------------------------- | ------------------- | ------------------- |
| Conversa com o tutor (B1+)        | ~12 conversas × 5 min de fala do tutor | ~US$0,90            | ~US$2,40            |
| Feedback individual falado        | ~10 min                                | ~US$0,15            | ~US$0,40            |
| Transcrição no iPhone (pela Fish) | até 1 h de fala do aluno               | até ~US$0,36        | até ~US$0,36        |
| **Total por aluno**               |                                        | **~US$1,05 a 1,40** | **~US$2,80 a 3,15** |

- **Conteúdo fixo em cache:** ~430 mil caracteres para o currículo inteiro (~288 lições), pagos uma vez: ~US$6,50 na Fish ou ~US$17 no ElevenLabs Flash.
- **Para 15 usuários da família:** IA de texto ~US$5-12 + voz ~US$16-21 na Fish ≈ **US$21-33/mês**. Com o ElevenLabs Flash, a voz sobe para ~US$42-47/mês.
- **Controles:** cache do conteúdo fixo; cota diária de fala na conversa; voz no painel de custos (`by_service`: `tts` e `stt`); kill-switch de voz que troca os fornecedores pagos pela Web Speech.

---

## 15. Roadmap detalhado

Estimativas para dedicação parcial (~10-15h/semana) com o Claude Code como parceiro de implementação. Total: **~6 a 7 meses até o app completo** (o tutor animado acrescentou ~3-4 semanas, ver ADR-003). As fases entregam valor incremental — a partir da Fase 1 o app já é usável diariamente.

> **Trilha paralela de conteúdo (contínua):** enquanto o código avança, o syllabus detalhado dos meses 3-12 e a curadoria de links do jw.org são escritos em paralelo (com minha ajuda aqui no chat). A Fase 1 só precisa dos meses 1-2.

---

### FASE 0 — Fundação (1 semana)

**Objetivo:** repositório profissional, deploy contínuo e esqueleto da arquitetura funcionando de ponta a ponta.

**Tarefas:**

1. Criar repositório Git com README, licença e este documento em `/docs`.
2. Bootstrap Next.js 14+ (App Router) com TypeScript `strict`, Tailwind, ESLint, Prettier, Husky (pre-commit: lint + typecheck).
3. Estrutura de pastas da seção 11.2 criada com arquivos-índice e um exemplo mínimo de cada camada (entidade → caso de uso → port → adapter fake → componente) para fixar o padrão.
4. Projeto Supabase: Auth (e-mail + Google), schema inicial aplicado com Row Level Security restritiva em todas as tabelas.
5. Deploy na Vercel conectado ao repo (preview por PR + produção na main); variáveis de ambiente (`ANTHROPIC_API_KEY`, config Supabase).
6. PWA base: manifest, ícones, service worker (Serwist), tela offline.
7. GitHub Actions: lint + typecheck + testes em todo PR.
8. `CLAUDE.md` escrito (convenções, arquitetura, comandos, definição de pronto).
9. Design tokens: paleta (modo claro/escuro), tipografia, espaçamentos, componentes base (Button, Card, ProgressBar).

**Entregáveis:** app "casca" no ar, instalável no celular, com login funcionando.
**Critérios de aceite:** clone → `npm i` → `npm run dev` funciona em < 5 min; CI verde; PWA instala no Android e iOS; login/logout ok; policy de RLS bloqueia leitura de dados de outro usuário (testado).

---

### FASE 1 — MVP do hábito (4-6 semanas) · _sem IA_

**Objetivo:** uma pessoa consegue estudar 20 min/dia por 4 semanas (currículo A1 inicial), com SRS, streak e progresso — tudo determinístico, custo zero, offline-first.

**Tarefas:**

1. **Domínio (semana 1):** entidades e serviços puros — `SrsCard` + `SrsScheduler` (SM-2 adaptado), `Exercise` + avaliadores determinísticos (múltipla escolha, lacuna, ordenar, associar, ditado com diff, V/F), `Streak`, `Session`. Testes unitários cobrindo ≥ 90% desses serviços (a lógica do SRS é o coração — testar datas, lapsos, limites).
2. **Conteúdo seed (paralelo):** escrever à mão as 4 primeiras semanas do Mês 1 (24 lições) no formato JSON do schema `content/lessons` — nós dois escrevemos aqui no chat e commitamos em `content/seed/`. Script de importação para o Supabase.
3. **Persistência:** Dexie (IndexedDB) como fonte local; `SyncEngine` simples (última escrita vence, fila de operações offline); repositórios Supabase.
4. **Session Player (semanas 2-3):** fluxo completo dos blocos da seção 6 (sem os blocos de IA: produção vira exercício determinístico extra nesta fase), timer orientativo, retomada de sessão, tela de fechamento com XP.
5. **Onboarding + nivelamento parcial:** telas de boas-vindas; teste de vocabulário sim/não e gramática adaptativa (120 itens calibrados escritos junto com o seed) — determinísticos. Botão "nunca estudei inglês".
6. **Dashboard:** hoje (sessão do dia), streak com escudos, progresso da unidade, contagem de palavras no SRS.
7. **Sessão de Resgate** (5 min de SRS).
8. **Beta fechado:** instalar no celular de 2-3 pessoas da família; registrar fricções.

**Entregáveis:** app estudável de verdade por 4 semanas de conteúdo.
**Critérios de aceite:** completar 7 sessões seguidas sem bug bloqueante; revisões SRS aparecem nas datas corretas (verificado com relógio simulado nos testes); funciona no modo avião após primeiro carregamento; 2 testers reais completam 1 semana; cobertura de testes do domínio ≥ 80%.

---

### FASE 2 — O cérebro de IA (4 semanas)

**Objetivo:** conteúdo gerado sob especificação com cache compartilhado, correção de escrita, nivelamento completo e motor adaptativo v1.

**Tarefas:**

1. **Proxy `/api/tutor`:** verificação da sessão do Supabase (`auth.getUser()`), rate limit por usuário, injeção do system prompt do servidor, prompt caching, log de tokens/custo em `admin/costs`, tratamento de erro com retry/backoff.
2. **System prompt do tutor v1** (arquivo versionado): persona, métodos da seção 2, erros PT-BR, estilo Murphy, formato JSON por tipo de tarefa. Escrever e testar aqui no chat antes de commitar.
3. **Specs das unidades (meses 1-3)** no formato `content/units` + validação zod.
4. **ContentGenerator + pipeline 9.3:** geração on-demand → validação de schema → validação pedagógica → salvar com `status: auto` → servir do cache. Fallback para lição seed em falha dupla.
5. **WritingCoach:** bloco de produção escrita da sessão (seg/qua/sex) ligado; UI de feedback erro a erro; itens sugeridos entram no SRS.
6. **Nivelamento completo:** etapas de escrita (IA) integradas ao teste; perfil por habilidade posiciona as trilhas.
7. **Motor adaptativo v1:** `topicMastery` + regras de domínio (8.2), `errorLog` alimentado pelos `errorCodes`, Remediator gerando mini-lições para tópicos < 60%, Elo básico na seleção de exercícios.
8. **Painel admin v1:** custo do dia/mês, fila de lições `auto` para aprovar/editar, visão de progresso dos usuários.

**Entregáveis:** aluno em qualquer ponto do A1-A2 recebe lições geradas/cacheadas e correção de escrita real.
**Critérios de aceite:** 95% das gerações passam na validação de schema em 1ª tentativa; lição gerada 1× é servida do cache nas próximas (verificar custo marginal ~zero); correção de escrita aponta erros reais em 10 textos de teste com qualidade aprovada por você; custo medido por sessão dentro da estimativa da seção 14; impossível chamar a API sem token válido (testado).

---

### FASE 3 — Ouvido e voz (4-5 semanas)

**Objetivo:** as 4 habilidades treináveis; material real do jw.org integrado ao fluxo; a voz do tutor no ar, com cache e fornecedor escolhido.

**Tarefas:**

1. **Curadoria inicial jw.org:** planilha → `content/jwRefs` com 40-60 conteúdos classificados (A1-B1) entre artigos com áudio e vídeos com legenda; tela admin de curadoria.
2. **Bloco Input Real do player:** leitura com áudio oficial (streaming da fonte), tarefa acoplada (compreensão/V-F geradas pela IA sobre o trecho, cacheadas por conteúdo).
3. **Ditado:** player de trecho curto → digitação → correção diff palavra a palavra com destaque visual; níveis de ajuda (velocidade 0.75×, repetição).
4. **Porta de voz e proxy `/api/voz` (ADR-003):** `VoicePort` com adaptadores Fish Audio, ElevenLabs e Web Speech; cache compartilhado em `tutor_audio_cache` + Supabase Storage; cota diária de fala; caracteres e custo em `admin_costs`; kill-switch de voz.
5. **Teste cego de vozes:** a mesma fala em português e em inglês em cada fornecedor; você escolhe a voz do tutor; a escolha fica registrada no ADR-003.
6. **TTS:** pronúncia de qualquer palavra/frase do app pelo `VoicePort` (com cache); botão de áudio nos cartões SRS.
7. **Pré-geração do áudio** das explicações e enunciados dos meses 1-3, em lote, no cache compartilhado.
8. **STT — leitura em voz alta:** gravação → transcrição (Web Speech no Android/Chrome) → comparação com o alvo → score de inteligibilidade + feedback curto do SpeechCoach (IA) sobre os desvios.
9. **Fallback iOS:** detecção de suporte; MediaRecorder grava e envia ao proxy `/api/voz` para transcrição pela API do fornecedor quando o STT nativo não estiver disponível; se nada disponível, a atividade degrada para shadowing auto-avaliado (ouvir → gravar → ouvir lado a lado → auto-marcar).
10. **Shadowing:** UI dedicada (áudio original + minha gravação, replay alternado).
11. **Rotação semanal completa** da seção 6 ativada (escrita e fala alternando).

**Entregáveis:** sessão diária cobre leitura, escuta, escrita e fala com material real; a voz do tutor está pronta para entrar na sessão.
**Critérios de aceite:** ditado e leitura em voz alta funcionam no Android/Chrome; iOS tem caminho funcional (fallback testado em 1 iPhone real); latência do feedback de fala < 6s; 3 testers avaliam o bloco de fala como "útil" ou melhor; a voz do tutor foi escolhida no teste cego; uma explicação tocada pela 2ª vez sai do cache, sem custo (conferido no painel).

---

### FASE 4 — Motivação (4-5 semanas)

**Objetivo:** avatar evolutivo, tutor animado, relatórios e lembretes — o app fica bonito, vivo e difícil de abandonar.

**Tarefas:**

1. **Avatar SVG por camadas:** 7 estágios + 6 acessórios de habilidade desenhados (posso gerar os SVGs base com você aqui); componente animado (Framer Motion) com cena de evolução.
2. **Economia de XP completa** (10.2) + `evolve-avatar` + tela do avatar com histórico de conquistas.
3. **Badges:** primeira semana, 30 dias de streak, 500 palavras, primeiro texto sem erros, primeira conversa etc.
4. **Relatório semanal:** cálculo no domingo (cron da Vercel) → tela + e-mail opcional com os números concretos da semana.
5. **Notificações:** Web Push (Android/desktop); iOS: orientação para adicionar à tela inicial + fallback de e-mail de lembrete.
6. **Mural da turma** (opcional por usuário): streaks e estágios dos amigos, aplausos.
7. **Tutor animado (ADR-003):** design do personagem feito aqui no chat (nome, visual, 6 formatos de boca + repouso, expressões); componente `TutorAvatar` em SVG por camadas com os estados da seção 4.9, boca guiada pela amplitude do áudio e legenda.
8. **Tutor na sessão e no onboarding:** apresentação no onboarding; narração da lição do dia (áudio em cache, disponível offline nas lições baixadas); comentário falado da produção; fechamento falado.
9. **Trilha de Imersão (seção 4.6):** registro rápido de atividades extras, XP de imersão (até 50/dia) e entrada no relatório semanal.
10. **Polimento visual geral:** revisão de todas as telas com os design tokens; modo escuro; micro-animações de acerto/erro.

**Entregáveis:** experiência completa de motivação, com o tutor presente em toda sessão.
**Critérios de aceite:** evolução do avatar dispara nos marcos certos (testes de regras); relatório de domingo chega para todos os testers; taxa de sessão diária dos testers ≥ 70% nas 2 semanas seguintes (medida real de que a gamificação funciona); a boca do tutor acompanha a fala sem atraso perceptível em Android e iPhone; uma lição baixada é narrada no modo avião; 3 testers avaliam o tutor como "agradável" ou melhor.

---

### FASE 5 — Conversa e profundidade (5 semanas)

**Objetivo:** o diferencial máximo — conversar por voz com o tutor animado — e a profundidade B2/C1 do currículo em espiral.

**Tarefas:**

1. **ConversationTutor (texto):** conversa contextual ao material da semana; correção gentil por recast (o tutor reformula certo e segue), com "raio-x" opcional ao final listando os pontos corrigidos; memória curta do aluno (resumo de perfil injetado).
2. **Conversa por voz com o tutor animado:** voz por streaming (`VoicePort.stream`); estados ouvindo → pensando → falando; turnos curtos (seção 9.6); aluno responde por STT; modo mãos-livres; boca guiada pela marcação de tempo quando o fornecedor a devolver (senão, pela amplitude); esgotada a cota diária de fala, a conversa segue em texto.
3. **Roleplays:** cenários práticos (dar testemunho informal, apresentar-se, explicar um versículo, situações cotidianas) definidos no syllabus.
4. **Espiral B2/C1:** specs dos meses 8-12 com as revisitas de profundidade; exercícios de nuance (escolher entre 2 formas corretas pela intenção).
5. **Resumos orais/escritos avaliados por rubrica.**
6. **Model routing:** conversa no Sonnet, resto no Haiku; medição do custo real do modo conversa (texto e voz, seções 14.2 e 14.4) e ajuste dos limites diários e da cota de fala.
7. **Marco trimestral:** mini-nivelamento comparativo com tela de evolução ("você subiu de A2.3 para B1.1 em leitura").

**Entregáveis:** app completo em funcionalidades de aprendizado.
**Critérios de aceite:** aluno B1 sustenta conversa de 5 min com correções úteis; tutor lembra erros recorrentes do aluno (verificável); custo do modo conversa (texto e voz) dentro das estimativas; a primeira fala do tutor começa em até ~3 s depois que o aluno termina (meta inicial); espiral aparece nos planos de sessão dos meses certos.

---

### FASE 6 — Lançamento para a família (2-3 semanas)

**Objetivo:** estabilidade, qualidade e adoção real.

**Tarefas:**

1. Testes E2E (Playwright) dos fluxos críticos: onboarding, sessão completa, offline→sync, compra de nada (não há pagamentos — só garantir que nada pede).
2. Auditoria de acessibilidade e performance (Lighthouse ≥ 90 em PWA/performance/a11y).
3. Analytics de aprendizado (eventos próprios em tabela Postgres, sem trackers de terceiros): conclusão de sessão, ponto de abandono, tempo por bloco.
4. Tela de convite: link mágico para família/amigos; onboarding revisado com os aprendizados dos testers.
5. Documentação final: atualizar este documento com o estado real ("as-built"), runbook de operação (custos, backups via `pg_dump` agendado, como aprovar conteúdo).
6. Rodada de feedback estruturada (formulário no app) + correções da lista.

**Entregáveis:** v1.0 em produção com a turma completa dentro.
**Critérios de aceite:** 10+ usuários ativos por 2 semanas; zero bugs bloqueantes abertos; custo mensal real dentro do teto; backup automático configurado; você consegue operar tudo pelo painel sem tocar em código.

---

### Linha do tempo consolidada

| Fase                        | Duração            | Marco                                        |
| --------------------------- | ------------------ | -------------------------------------------- |
| 0 — Fundação                | 1 sem              | Casca no ar, CI, PWA                         |
| 1 — MVP do hábito           | 4-6 sem            | Estudável (A1, sem IA)                       |
| 2 — Cérebro de IA           | 4 sem              | Conteúdo gerado + correção de escrita        |
| 3 — Ouvido e voz            | 4-5 sem            | 4 habilidades + jw.org + voz do tutor        |
| 4 — Motivação               | 4-5 sem            | Avatar, tutor animado, relatórios, lembretes |
| 5 — Conversa e profundidade | 5 sem              | Conversa por voz com o tutor, B2/C1          |
| 6 — Lançamento              | 2-3 sem            | v1.0 com a família                           |
| **Total**                   | **~24-29 semanas** | **App completo**                             |

---

## 16. Riscos e mitigações

| #   | Risco                                                            | Impacto     | Mitigação                                                                                                                                              |
| --- | ---------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Direitos autorais Murphy                                         | Legal       | Usar apenas a sequência de tópicos como mapa; todo conteúdo gerado é original; livro citado só como referência para quem o possui                      |
| 2   | Uso do conteúdo jw.org                                           | Legal/ético | Nunca copiar/armazenar publicações; apenas referenciar e abrir da fonte oficial; citações mínimas com fim didático; respeitar os termos de uso do site |
| 3   | Qualidade da geração por IA (erros no gabarito, explicação ruim) | Produto     | Validação de schema + validação pedagógica automática + fila de revisão humana + fallback seed + botão "reportar erro" em todo exercício               |
| 4   | STT no iOS/Safari limitado                                       | Produto     | Fallback MediaRecorder→API; degradação para shadowing auto-avaliado; testar em iPhone real na Fase 3                                                   |
| 5   | Custo de IA fugir do previsto                                    | Financeiro  | Cache de conteúdo, prompt caching, rate limit, teto no console, kill-switch, painel de custo diário                                                    |
| 6   | Abandono do hábito pelos usuários                                | Missão      | Streak com escudos, sessão de resgate, lembretes, relatório de progresso concreto, mural da turma                                                      |
| 7   | Escopo crescer sem fim (feature creep)                           | Cronograma  | Este documento é o contrato de escopo da v1; ideias novas vão para a seção 19 (backlog), não para a fase atual                                         |
| 8   | Nivelamento impreciso frustrar veteranos                         | Produto     | Nivelamento provisório com correção acelerada nas 2 primeiras semanas + botão "isso está fácil/difícil demais" que alimenta o motor                    |
| 9   | Dependência de um só desenvolvedor (você)                        | Operacional | CI, testes, documentação as-built e runbook desde o início; Claude Code acelera manutenção                                                             |
| 10  | Custo de voz fugir do previsto                                   | Financeiro  | Cache do conteúdo fixo, cota diária de fala, voz no painel de custos, kill-switch para a Web Speech (ADR-003)                                          |
| 11  | Voz ruim em português ou em inglês                               | Produto     | Teste cego na Fase 3 com a mesma voz nos dois idiomas; se preciso, uma voz por idioma                                                                  |
| 12  | Conversa por voz lenta                                           | Produto     | Voz por streaming, turnos curtos, estado "pensando" animado, meta de ~3 s até a primeira fala                                                          |
| 13  | Dependência de um fornecedor de voz                              | Operacional | `VoicePort` com três adaptadores; troca por configuração                                                                                               |

---

## 17. Métricas de sucesso

**De produto (v1, família e amigos):**

- ≥ 10 usuários ativos; taxa de sessão diária ≥ 60% na média de 30 dias; retenção D30 ≥ 70%.
- Tempo médio de sessão entre 15-25 min (nem raso, nem cansativo).
- ≥ 70% dos alunos mantêm a voz do tutor ligada (sinal de que o tutor agrada).

**De aprendizado (as que importam):**

- Velocidade de domínio: ≥ 3 tópicos masterizados/mês por aluno ativo.
- Retenção de vocabulário: ≥ 80% de acerto nas revisões SRS maduras (intervalo ≥ 21 dias).
- Avanço objetivo: +0,5 a +1,0 nível CEFR interno por trimestre nos marcos trimestrais.
- Produção: evolução mensurável na rubrica de escrita (nota média subindo trimestre a trimestre).

**Operacionais:**

- Custo de IA de texto ≤ US$1,50 e de voz ≤ US$1,50 por usuário ativo/mês; uptime "sempre que alguém tentou estudar, conseguiu"; zero incidentes de segurança.

---

## 18. Uso com Claude Code

1. **Setup:** este documento em `docs/PLANEJAMENTO.md`; o `CLAUDE.md` na raiz resume arquitetura, convenções e aponta para cá ("leia docs/PLANEJAMENTO.md antes de qualquer tarefa").
2. **Trabalhe por fase e por caso de uso:** peça uma tarefa por vez ("implemente o SrsScheduler conforme seções 8.4 e 13, com testes"), não "faça a fase 1".
3. **Ordem dentro de cada tarefa:** domínio (com testes) → caso de uso → adapter → UI. Nunca o contrário.
4. **Definição de pronto (colar no CLAUDE.md):** typecheck e lint sem erros; testes novos passando; regra de negócio só no domínio/aplicação; nenhum acesso direto a Supabase/Anthropic fora de `infrastructure`; commit pequeno com mensagem descritiva.
5. **Revisão:** peça ao Claude Code para explicar as decisões e apontar dívidas técnicas ao final de cada tarefa; dívidas viram issues.
6. **Conteúdo e prompts continuam aqui no chat:** syllabus, system prompt do tutor, seed de lições, curadoria e o design do tutor e do avatar são trabalho de planejamento — geramos aqui e commitamos como arquivos versionados.

---

## 19. Backlog futuro (pós-v1)

- Exportar cartões para Anki; importar listas próprias de vocabulário.
- Grupos de estudo com metas compartilhadas; modo dupla (praticar diálogo com outro usuário).
- Certificado interno de conclusão de nível (bonito, compartilhável).
- Trilhas temáticas extras (inglês para reuniões, para viagem, para leitura da Bíblia em inglês com glossário próprio).
- Sons/haptics de feedback; temas visuais do avatar.
- Escolher entre vários tutores (personagens e vozes diferentes).
- Tutor desenhado no Rive, com animação mais rica (ADR-003).
- Conversa guiada com o tutor já no A1-A2 (diálogos curtos com roteiro).
- Modo tablet/desktop otimizado para sessões de escrita longas.
- Suporte a outros idiomas de origem (espanhol → inglês) reaproveitando o motor.
- Publicação nas lojas (TWA/Capacitor) se a base de usuários crescer.

---

_Fim do documento. Próximos artefatos a produzir no planejamento: (1) syllabus detalhado dos Meses 1-2, unidade por unidade; (2) CLAUDE.md; (3) system prompt do tutor v1; (4) seed das primeiras lições._
