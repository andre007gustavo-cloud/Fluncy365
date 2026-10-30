# FLUENTE365 · Módulo Emakhuwa — Professor de IA por texto paralelo

### Curso pessoal de emakhuwa (macua) dentro do Fluente365 · 20 minutos por dia

> **Versão do documento:** 1.2 · 30/10/2026 · **Status:** aprovado pelo André
> **v1.1:** versão com acervo autorizado pelo jw.org (ver seção 16 e ADR-005)
> **v1.2:** laboratório pela assinatura (Agent SDK), Opus revisando todo o alinhamento, processamento sob demanda (ADR-006)
> **Local no repositório:** `docs/PLANEJAMENTO-EMAKHUWA.md` (substitui a v0.1)
> **Relação com o plano principal:** complementa o [`PLANEJAMENTO.md`](./PLANEJAMENTO.md) (v1.3). Tudo que não estiver dito aqui segue o plano principal: arquitetura, SOLID, testes, CI e definição de pronto.
> **Decisões registradas em:** [`ADR-002`](./ADR-002-multi-idioma.md) (multi-idioma), [`ADR-004`](./ADR-004-modulo-emakhuwa.md) (este módulo) e [`ADENDO-v1.3`](./ADENDO-v1.3.md) (política de IA e voz).
>
> **O que mudou em relação à v0.1:**
>
> - **Escopo:** de "só leitura" para as quatro habilidades, incluindo conversa do dia a dia.
> - **Corpus:** no Supabase, visível só para o André, com cópia offline no Dexie.
> - **Coleta:** importação de arquivos baixados (EPUB, MP3, MP4), no lugar de um coletor que busca páginas do site.
> - **Agente professor:** com ferramentas e um plano de treino em lotes.
> - **Laboratório local:** monta a base de conhecimento do agente.
> - **Seis níveis de confiança no léxico:** entra o "verificado" pelo falante.
> - **Tutor animado:** fala português e emakhuwa.
> - **Novos exercícios:** tradução reversa, vídeo e conversa guiada.
> - **Opus 5.5 e "qualidade primeiro".**
> - **Roadmap:** novo, de E0 a E12, em ordem acelerada.
> - **Mantido da v0.1:** `CorpusGuard`, regras numéricas de evidência, botão de contestar, seletor de frases (i+1), conferência de cobertura do alinhamento e critérios de seguir ou parar.

---

## Sumário

1. Resumo
2. O desafio do emakhuwa
3. Regras do jogo: termos de uso do jw.org
4. Fundamentos pedagógicos
5. Pipeline do corpus paralelo
6. O agente professor e os papéis da IA
7. Exercícios e validação
8. A sessão diária de 20 minutos
9. Currículo em estágios
10. Modelo do aluno e métricas
11. O informante humano
12. Integração técnica no Fluente365
13. Roadmap — fases E0 a E12
14. Custos, riscos e expectativas
15. Decisões
16. Versão com acervo autorizado
17. Fontes

---

## 1. Resumo

O módulo ensina emakhuwa usando o acervo paralelo do jw.org (português ↔ emakhuwa) como professor, e a IA como monitora que alinha, explica e corrige — sempre ancorada nesse acervo, nunca "de cabeça".

O motivo é simples: o emakhuwa tem pouquíssimo material didático e a IA não domina o idioma. A fonte de verdade passa a ser o texto oficial traduzido. A IA trabalha em cima dele e marca como hipótese tudo o que não tem evidência.

**Três pilares**

1. **Corpus paralelo pessoal.** Cada publicação baixada nos dois idiomas é alinhada parágrafo → frase → palavra e vira matéria-prima de lições, cartões e testes.
2. **Validação por gabarito oficial.** Todo exercício tem resposta tirada do texto oficial, ou é corrigido em português, onde a IA é confiável.
3. **Ciclo humano.** Um falante fluente, cerca de 30 minutos por semana, confirma o que a IA não consegue resolver sozinha.

**O que o módulo entrega:** um segundo curso dentro do Fluente365, separado do inglês, com sessão de 20 minutos, SRS, streak e avatar próprios, e o tutor animado. Com a autorização do jw.org, o acervo é coletado automaticamente, processado uma vez e servido a usuários convidados (seções 3 e 16).

**Meta honesta para 12 meses a 20 min/dia:**

- ler e acompanhar bem publicações e reuniões em emakhuwa;
- preparar comentários e apresentações;
- manter conversas simples do dia a dia.

Conversa livre e fluente fica além desse prazo e depende do falante (seções 7.3 e 14).

---

## 2. O desafio do emakhuwa

O emakhuwa é uma língua banta com tom, vogais longas e classes nominais, quase sem material didático digital. O jw.org é, de longe, o maior acervo paralelo com o português.

### 2.1 O que o idioma tem de diferente

- É a língua nativa mais falada de Moçambique, concentrada no norte, na província de Nampula ([Wikipedia](https://en.wikipedia.org/wiki/Makhuwa_language)).
- Tem variantes com inteligibilidade mútua limitada. O Makhuwa Central (código `vmw`) é a base da norma padrão ([Wikipedia](https://en.wikipedia.org/wiki/Makhuwa_language)). O jw.org publica em Emakhuwa e também em Emakhuwa-Meetto, -Shirima e -Marrevone ([jw.org](https://www.jw.org/vmw/Ebibilioteka/Indexes/)). **Variante escolhida: Emakhuwa central (`vmw`).**
- O tom é distintivo e gramatical, e vogal curta × longa muda o sentido: _omala_ "terminar" × _omaala_ "colar" ([Oxford Guide to the Bantu Languages](https://academic.oup.com/book/61440/chapter/534774441)).
- O verbo é aglutinante, montado em "encaixes": negação · sujeito · tempo/aspecto · objeto · raiz · extensões · vogal final ([emakhuwa-tokenizer](https://pypi.org/project/emakhuwa-tokenizer/)).
- A ortografia ainda é inconsistente, e os empréstimos do português são adaptados de três jeitos diferentes ([Ali et al., WMT 2024](https://arxiv.org/html/2408.11457v1)).

### 2.2 Recursos que já existem

| Recurso                                                                                                                                             | O que é                                     | Uso no módulo                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------ |
| [Corpus PT–emakhuwa de pesquisa](https://arxiv.org/pdf/2104.05753)                                                                                  | 47.415 pares de frases, boa parte do jw.org | Prova que o alinhamento automático funciona      |
| [Dados abertos do LIACC](https://repositorio-aberto.up.pt/handle/10216/163622) e [FLORES+ emakhuwa](https://arxiv.org/abs/2408.11457v1)             | Notícias traduzidas à mão, licença aberta   | Calibrar a IA e trazer vocabulário do dia a dia  |
| [Vocabulário de Emakhuwa Central (SIL)](https://www.sil.org/resources/archives/42995)                                                               | Dicionário em português                     | Conferir o dicionário vivo                       |
| [Notas gramaticais sobre Emakhuwa-Imeetto (SIL)](https://publikationen.ub.uni-frankfurt.de/opus4/files/22344/SILMozambique_GramaticaisEmakhuwa.pdf) | Gramática curta, cópia livre                | Conferir padrões descobertos                     |
| [emakhuwa-tokenizer](https://pypi.org/project/emakhuwa-tokenizer/)                                                                                  | Analisador morfológico com regras em JSON   | Separar raiz e afixos (licença a verificar)      |
| [MMS-TTS emakhuwa (Meta)](https://huggingface.co/facebook/mms-tts-vmw/commits/main)                                                                 | Voz sintética, licença não comercial        | Candidata a voz do tutor em emakhuwa (seção 6.7) |

O app oficial JW Language foi descontinuado em abril de 2026; o jw.org explicou que apps, recursos online e ferramentas de IA hoje cobrem essa necessidade ([jw.org](https://www.jw.org/en/online-help/jw-language/)).

### 2.3 Limites da IA neste idioma

- Modelos de tradução automática ainda vão mal no par português–emakhuwa ([Ali et al., WMT 2024](https://arxiv.org/html/2408.11457v1)).
- Em idiomas raros, frases paralelas de exemplo ajudam os modelos muito mais do que explicações gramaticais ([Aycock et al., ICLR 2025](https://arxiv.org/html/2409.19151v2)); gramática sozinha não basta ([Shaw et al., 2025](https://arxiv.org/abs/2508.06665v1)).
- Consequência de projeto: toda chamada à IA leva junto as frases paralelas mais parecidas do corpus (seção 6.6).

---

## 3. Regras do jogo: autorização do jw.org

O jw.org aprovou, em 30/10/2026, a proposta de uso do acervo para este módulo. A resposta escrita e os itens aprovados estão em [`autorizacao-jw.md`](./autorizacao-jw.md); as decisões de arquitetura, no [`ADR-005`](./ADR-005-acervo-autorizado.md).

**Regras de projeto**

1. **Só o que foi autorizado.** Cada parte (coleta, biblioteca no servidor, distribuição, outros idiomas) liga apenas se o item correspondente estiver marcado como "sim" em `autorizacao-jw.md`. Condições impostas pela organização prevalecem sobre este plano.
2. **Só arquivos públicos.** EPUB, MP3, MP4 e legendas oferecidos ao público. Nada de varrer páginas HTML.
3. **Bom vizinho.** Um download por vez, com pausa, janela noturna, cada arquivo baixado uma vez só, coletor identificado com nome do app e contato, parada imediata se o site responder com erro ou pedir para parar.
4. **Texto fiel.** O texto oficial nunca é alterado; o agente explica só a língua, nunca doutrina.
5. **Atribuição.** Toda tela com conteúdo traz o título da publicação, o aviso de direitos e o link para a página oficial.
6. **Não comercial e controlado.** Gratuito, sem anúncios, sem venda de dados; só usuários logados e convidados; nada público na internet.
7. **Retirada a pedido.** Qualquer publicação, idioma ou o acervo inteiro sai em até 7 dias se a organização pedir.
8. **Transparência.** Lista do que foi coletado e relatório de uso disponíveis para a organização.

Enquanto a importação manual do v1.0 existir, ela continua funcionando como reserva, caso o coletor pare.

---

## 4. Fundamentos pedagógicos

O método junta input compreensível com texto paralelo, decodificação palavra a palavra, gramática descoberta pelo próprio aluno e recordação ativa com repetição espaçada — tudo tirado do corpus.

A distribuição do tempo segue as quatro vertentes de Paul Nation: cerca de um quarto para input com sentido, um quarto para produção, um quarto para foco na forma e um quarto para fluência.

| Método                           | O que é                                                                    | Como entra no módulo                                                          |
| -------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Leitura-escuta paralela          | Ouvir o áudio oficial em emakhuwa lendo o português; depois só o emakhuwa  | Bloco de input, todo dia                                                      |
| Decodificação (Birkenbihl)       | Tradução literal palavra a palavra, ou morfema a morfema, embaixo do texto | Leitor interlinear: mostra a montagem banta das palavras                      |
| Gramática por descoberta         | Ver 6 a 10 frases reais com o mesmo padrão e deduzir a regra               | IA propõe hipótese; gramática da SIL e falante confirmam                      |
| Frequência primeiro              | Aprender antes as palavras que mais aparecem                               | Lista de lemas calculada do próprio corpus                                    |
| Leitura estreita                 | Muitos textos do mesmo tema ou série                                       | A semana gira em torno de um texto: o texto diário, depois o artigo de estudo |
| Recordação ativa + SRS           | Produzir antes de ver a resposta, em intervalos crescentes                 | Cartões de frase com lacuna, no mesmo SM-2 do Fluente365                      |
| Tradução reversa                 | Ver o português de uma frase já estudada e reconstruí-la em emakhuwa       | Produção com gabarito: o original oficial                                     |
| Treino perceptivo de tom e vogal | Pares mínimos com várias vozes reais                                       | Exercícios curtos de "ouça e escolha"                                         |
| Shadowing e ditado               | Repetir imitando o ritmo; transcrever o que ouve                           | Áudio oficial, frase a frase                                                  |
| Objetivo funcional               | Treinar para tarefas reais                                                 | Entender a reunião, preparar um comentário, conversar no dia a dia            |

A escolha mais importante é a tradução reversa: ela dá produção de verdade com uma resposta de referência, sem depender de a IA saber emakhuwa.

---

## 5. Pipeline do corpus paralelo

Cada publicação importada passa por seis etapas e vira matéria-prima de lições, cartões e testes. O pipeline roda no laboratório local (seção 12.1).

1. **Importar.** O André escolhe o EPUB da mesma publicação nos dois idiomas. O laboratório abre o EPUB (um pacote de páginas HTML) e extrai parágrafos, subtítulos, perguntas de estudo e referências bíblicas. O importador lê o idioma declarado no arquivo e recusa o que não for emakhuwa central, para nunca misturar variantes.
2. **Alinhar parágrafos.** As publicações traduzidas do jw.org mantêm a mesma estrutura: parágrafos numerados, subtítulos, perguntas. O alinhamento é 1:1 por posição e número, com conferência automática. A Bíblia, se houver no idioma, alinha por versículo.
3. **Alinhar frases.** O código separa as frases de cada par de parágrafos e propõe o pareamento por comprimento e por âncoras (números, nomes próprios, referências bíblicas). **O Opus revisa todos os pares**: confirma, junta ou divide (casos 1:2 e 2:1), marca traduções não literais e dá a nota de confiança. A conferência de cobertura continua: juntar as frases tem que reproduzir o parágrafo, nos dois idiomas.
   - Pares com confiança abaixo de 0,7 ficam guardados, mas fora de lições e exercícios.
4. **Analisar palavras no contexto.** A análise é feita **frase a frase, pelo sentido**, nunca palavra por palavra. O Opus recebe a frase nos dois idiomas, a análise morfológica (regras do emakhuwa-tokenizer) e os candidatos estatísticos (IBM Model 1 sobre o acervo), e explica o que cada parte da frase em emakhuwa faz naquele contexto. Cada sentido de uma palavra é guardado com as frases de onde veio. Quando uma palavra aparece num contexto em que nenhum sentido guardado encaixa, ela é reanalisada. Resultado: candidatos com evidência, não certezas.
5. **Dicionário vivo.** A unidade é a palavra como aparece no texto; a raiz proposta agrupa as formas em famílias. Cada entrada tem sentidos em português, frases-evidência, número de ocorrências, número de documentos diferentes e status (seção 6.3). O Vocabulário da SIL serve de conferência.
6. **Sincronizar áudio.** Na primeira versão, o MP3 do texto é cortado por parágrafo (detecção de pausas, com ajuste manual). O corte por frase, com alinhamento forçado, é testado na fase E3.

**Ordem de processamento (sob demanda).** Primeiro o material da reunião da semana e o que o André estiver estudando; depois textos diários, folhetos, cânticos e vídeos curtos; livros longos por último. A contagem de ocorrências (código, sem IA) roda no acervo todo desde o começo, para o `EvidenceScorer` acumular provas mais rápido.

**Vídeos.** O MP4 do mesmo vídeo nos dois idiomas, com as legendas quando houver, entra pelo mesmo caminho. As falas se alinham pelo tempo, e o texto alimenta o dicionário vivo como qualquer artigo (seção 7.2).

**Fontes, em ordem.** O ponto de partida é o texto diário: curto, um por dia e já paralelo. Se o livro anual do texto diário existir em EPUB em emakhuwa (a confirmar na E0), um download em cada idioma dá 365 textos. A ordem sugerida é:

- texto diário e folhetos;
- cânticos;
- artigos curtos;
- artigos completos.

Para o dia a dia, entram o corpus aberto de notícias do LIACC e o caderno de frases do falante (seção 7.3).

**O informante fecha o ciclo:** as dúvidas que sobram das etapas 3 a 5 viram perguntas semanais, e as respostas sobem o nível de confiança das entradas (seção 11).

---

## 6. O agente professor e os papéis da IA

A IA nunca é a autoridade sobre o emakhuwa: ela trabalha em cima de evidências do corpus, e tudo o que mostra ao aluno carrega um nível de confiança.

### 6.1 Ensinar emakhuwa a um agente: nutrir, não treinar

O agente professor é o centro do módulo. Ele aprende do jeito que funciona hoje para um idioma raro: consultando, a cada pergunta, uma base de conhecimento que cresce. O modelo não é mudado por dentro.

| Caminho                                      | Como funciona                                                                                                                   | Veredito                                                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Base de conhecimento + busca                 | O agente tem ferramentas para buscar no corpus alinhado, no dicionário vivo, nas regras confirmadas e nas transcrições de vídeo | **Escolhido:** exemplos paralelos são o que mais ajuda os modelos em idiomas raros ([Aycock et al.](https://arxiv.org/html/2409.19151v2)) |
| Despejar tudo no contexto                    | Colocar artigos inteiros e milhares de pares em cada chamada                                                                    | Funciona em pequena escala, mas fica caro e dilui a atenção                                                                               |
| Ajuste fino de um modelo pequeno de tradução | Treinar um modelo aberto com os pares do corpus, no computador                                                                  | Opcional, pós-v1: vira um "sugestor de tradução"; exige placa de vídeo ou muitas horas de processamento                                   |

O agente melhora sozinho com o tempo: cada artigo ou vídeo importado aumenta o corpus, o dicionário e as regras confirmadas. Mesmo bem nutrido, porém, ele pode errar emakhuwa com confiança. Por isso os níveis de confiança e o falante continuam valendo.

### 6.2 Ferramentas do agente

- `searchParallel(texto)` → pares de frases mais parecidos, com áudio quando houver
- `lookupLexicon(forma)` → sentidos, classe, frases-evidência, status
- `getConfirmedRules(tópico)` → padrões já validados
- `getVideoTranscript(vídeo, trecho)` → falas nos dois idiomas, com tempo
- `getStudentProfile()` → níveis, erros recorrentes, palavras fracas
- `logInformantQuestion(item)` → manda a dúvida para a fila do falante

### 6.3 Níveis de confiança do léxico

| Nível      | Regra                                                                 | O que libera                            |
| ---------- | --------------------------------------------------------------------- | --------------------------------------- |
| Oficial    | Texto do jw.org                                                       | Gabarito de todos os exercícios         |
| Verificado | O falante fluente ou uma fonte publicada (SIL, dicionário) confirmou  | Tudo, inclusive virar regra ensinada    |
| Confirmado | ≥ 5 ocorrências com sentido consistente, em ≥ 3 documentos diferentes | Cartão SRS e lacuna em exercício        |
| Provável   | ≥ 3 ocorrências com sentido consistente                               | Cartão SRS (ainda não vira lacuna)      |
| Hipótese   | 1 a 2 ocorrências, ou evidência inconsistente                         | Só "pista a investigar", nunca gabarito |
| Contestado | Evidência conflitante, ou o aluno marcou "acho que está errado"       | Sai do SRS e vai para a fila do falante |

- **Quem decide o status é código, não a IA.** A IA propõe o sentido de cada ocorrência; o `EvidenceScorer` (domínio, testado) conta, compara e decide.
- **Os limiares (3, 5 e 3 documentos) são configuráveis** e calibrados na E2.
- **Padrões gramaticais seguem a mesma regra** e só entram em lições a partir de "provável".
- **Botão "contestar".** Em qualquer palavra ou explicação, o aluno pode marcar "acho que está errado". A entrada sai do SRS e é reavaliada quando surgirem novas ocorrências. Três contestações sem resolução congelam a entrada até o falante responder.

### 6.4 A trava principal: `CorpusGuard`

Toda palavra ou frase em emakhuwa que a IA devolve para mostrar ao aluno passa por uma checagem de código: precisa existir, letra por letra (depois de normalizada), em algum trecho do corpus ou do caderno de frases verificado. Se não existir, a resposta inteira é rejeitada e refeita.

Há só duas exceções, sempre sinalizadas:

- o texto que o próprio aluno escreveu;
- sugestões de correção na tradução reversa ou frases da conversa livre (seção 7.3) que não estejam no corpus. Essas aparecem como "hipótese", nunca como modelo.

Assim o app não consegue ensinar emakhuwa inventado, diga o prompt o que disser.

### 6.5 O que a IA faz e o que não faz

**Faz:**

- confere alinhamentos duvidosos;
- gera o interlinear (glosa) de cada frase, usando frases paralelas do corpus como exemplo;
- explica em português os padrões que as evidências mostram;
- corrige compreensão: o aluno escreve em português o que entendeu e a IA compara com o português oficial — julgamento em português, onde ela é confiável;
- compara a tradução reversa do aluno com o original e classifica cada diferença: igual, variação provável, erro ou incerto (incerto vai para o falante);
- escolhe frases do corpus para exercícios e cria perguntas e mnemônicos em português;
- organiza a lista semanal de dúvidas e estrutura as respostas do falante.

**Não faz:**

- inventar frases em emakhuwa e apresentá-las como modelo correto;
- dar a palavra final sobre gramática sem evidência;
- corrigir pronúncia ou tom por conta própria.

**Toda resposta cita a fonte.** Quando o agente responde uma pergunta sobre emakhuwa, mostra as frases do corpus que sustentam a resposta e o nível de confiança. Sem evidência, ele diz isso — não improvisa.

### 6.6 Como cada chamada é montada e qual modelo

Cada chamada leva:

- o manual do agente (seção 6.8);
- o perfil do aluno;
- as frases paralelas mais parecidas do corpus;
- as entradas relevantes do dicionário vivo;
- as regras já confirmadas.

**Modelo: Claude Opus 5.5 em todo o módulo** (ADENDO-v1.3). O Fable 5.1 fica fora. Como teste opcional na E0, o André pode repetir uma análise no chat com o Fable, trocando o modelo no seletor; só muda se o ganho for claro.

### 6.7 O tutor animado e a voz em emakhuwa

O agente professor ganha o rosto e a voz do tutor animado do Fluente365 (ADR-003). O tutor também fala emakhuwa, com a pronúncia validada pelo falante (ADR-004).

**De onde vem cada fala:**

- **Português:** a voz natural do tutor (Fish Audio ou ElevenLabs), com cache, igual ao curso de inglês.
- **Emakhuwa, em ordem de preferência:**
  1. áudio oficial do jw.org, quando a frase existe gravada (recorte do MP3 ou do vídeo);
  2. gravações do falante fluente;
  3. voz sintética gerada no laboratório. Candidatas: a voz da Meta treinada em emakhuwa ([MMS-TTS](https://huggingface.co/facebook/mms-tts-vmw/commits/main), licença não comercial, serve para uso pessoal) e as vozes multilíngues da Fish e da ElevenLabs lendo texto em emakhuwa.

**Teste com o falante.** As mesmas 20 frases em cada voz candidata, ao lado do áudio oficial; o falante dá nota de pronúncia e de tom. A melhor vira a voz do tutor em emakhuwa. Se nenhuma passar, o tutor fala emakhuwa só com áudio oficial ou gravado.

**Regras:**

- o tutor só pronuncia emakhuwa que passou no `CorpusGuard`;
- a fala sintética aparece com um selo discreto, e o botão "pronúncia estranha" manda o trecho para a fila do falante;
- legenda sempre, nos dois idiomas, e a boca acompanha a amplitude do áudio, como no ADR-003.

### 6.8 Plano de treino do agente

"Treinar" o agente é um ciclo de cinco peças que roda em lotes, começando antes das telas do app.

1. **Manual do agente (prompt v1).** Persona, regras (`CorpusGuard`, citar a fonte, níveis de confiança), ferramentas e formato de resposta por tarefa. Escrito e testado no chat (fase E0) e versionado em `prompts/vmw/`.
2. **Ferramentas.** As seis da seção 6.2, consultando a base na conta do André no Supabase.
3. **Base de conhecimento, em lotes** (metas iniciais):
   1. Lote 1 — calibração: 30 textos diários e 3 folhetos. Mede os critérios de seguir ou parar (seção 13.2).
   2. Lote 2: o ano inteiro do texto diário (se o EPUB existir em emakhuwa) e 10 artigos.
   3. Lote 3: 50 artigos, 20 vídeos com legenda e o corpus de notícias do LIACC.
   4. Depois, contínuo: o artigo da semana, vídeos novos e as respostas do falante.
4. **Prova fixa do agente.** Cerca de 100 itens com gabarito do texto oficial:
   - 40 pares de frases para alinhar;
   - 30 palavras para glosar;
   - 20 perguntas ao agente;
   - 10 traduções reversas.

   Roda a cada lote, e o resultado mostra se o agente está melhorando. Quando o falante entrar, ele confere uma amostra.

5. **Ajuste.** Se a prova piorar ou travar, ajusta-se o manual ou a busca antes do próximo lote.

---

## 7. Exercícios e validação

Todo exercício tem gabarito vindo do texto oficial ou é avaliado em português — assim a correção não depende de a IA "saber" emakhuwa.

### 7.1 Tipos de exercício

| Exercício                                            | Habilidade           | Gabarito                                                                             | Correção                                                                                                |
| ---------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Lacuna em frase real                                 | Leitura, vocabulário | Palavra do original, só se estiver "confirmada" ou acima                             | Código, com tolerância ortográfica                                                                      |
| Associar palavra ↔ sentido                           | Vocabulário          | Dicionário vivo, "provável" ou acima                                                 | Código                                                                                                  |
| Ordenar a frase (até 8 palavras)                     | Sintaxe              | Frase original                                                                       | Código                                                                                                  |
| Qual a tradução?                                     | Leitura              | Frase em emakhuwa → escolher o português certo entre o original e 3 de outras frases | Código                                                                                                  |
| Montar o verbo por encaixes                          | Morfologia           | Forma que aparece no corpus                                                          | Código                                                                                                  |
| Decodificar: ligar palavras EM ↔ PT                  | Estrutura            | Alinhamento validado                                                                 | Código                                                                                                  |
| Ditado de trecho do áudio oficial                    | Escuta               | Texto oficial                                                                        | Código (diferença palavra a palavra)                                                                    |
| Ouça e escolha (tom, vogal longa)                    | Escuta fina          | Par mínimo verificado                                                                | Código                                                                                                  |
| Ler antes de revelar                                 | Leitura              | Português oficial                                                                    | Autoavaliação: o aluno lê, marca quanto entendeu e revela                                               |
| Compreensão: dizer em PT o que um parágrafo novo diz | Leitura              | Português oficial                                                                    | IA em português, rubrica 0-5                                                                            |
| Tradução reversa PT → EM                             | Escrita              | Original oficial                                                                     | Similaridade (chrF) + IA explica; correção fora do corpus aparece como hipótese; incerto vai ao falante |
| Shadowing e leitura em voz alta                      | Fala                 | Áudio oficial                                                                        | Autoavaliação lado a lado; reconhecimento de voz se o teste da E3 aprovar                               |
| Comentário preparado (2-3 frases)                    | Produção livre       | Não há                                                                               | IA confere se bate com o sentido em PT que o aluno quis dizer; falante aprova                           |

Frases com alinhamento abaixo de 0,7 ficam fora de todos os exercícios, e toda frase em emakhuwa exibida passa pelo `CorpusGuard`.

Oito dos treze tipos são corrigidos só por código, com custo zero e funcionando offline. Os novos tipos entram como novas implementações de `Exercise` com renderer próprio, sem mexer no player nem nos avaliadores existentes (seção 13 do PLANEJAMENTO).

### 7.2 Aprender por vídeo: assistir e contar

Os vídeos em emakhuwa do jw.org viram aulas: o aluno assiste, conta o que entendeu, e a correção usa a transcrição já conhecida do vídeo.

**De onde vem o gabarito:**

- O mesmo vídeo existe em português e em emakhuwa. Quando há legenda, ela já é a transcrição, com o tempo de cada fala, e as legendas dos dois idiomas se alinham pelo tempo, frase a frase.
- Sem legenda em emakhuwa, a transcrição vem de reconhecimento de voz, se ele funcionar bem no teste da E3. Senão, o vídeo fica só com o gabarito em português.
- O agente extrai uma vez, do português, os 5 a 7 pontos-chave do vídeo e guarda. Esse é o gabarito do resumo.

**Fluxo:**

1. Assistir com legenda em português.
2. Reassistir com legenda em emakhuwa, ou só com o áudio.
3. Contar o que entendeu, no nível em que o aluno está:
   1. **Nível 1 — resumo em português:** comparado aos pontos-chave. Julgamento em português, confiável desde o primeiro dia.
   2. **Nível 2 — 5 palavras ou expressões em emakhuwa que ouviu:** conferidas na transcrição, por código.
   3. **Nível 3 — resumo curto escrito em emakhuwa:** cobertura dos pontos-chave, mais as diferenças de língua apontadas com evidência do corpus.
   4. **Nível 4 — resumo falado:** transcrito por reconhecimento de voz e corrigido como o nível 3. Se o reconhecimento não for confiável, a gravação vai para o falante.
4. As falas do vídeo viram cartões SRS com o trecho de áudio do próprio vídeo, e servem de shadowing.

Na sessão, o bloco de input alterna texto e vídeo. No domingo, um vídeo inteiro com resumo pode ser o teste da semana.

### 7.3 Conversa do dia a dia

O objetivo inclui conversar no dia a dia. É a parte mais difícil para a IA, porque conversa livre exige criar frases novas em emakhuwa — exatamente o que o `CorpusGuard` bloqueia. Por isso a conversa entra em quatro degraus:

1. **Caderno de frases do dia a dia.** Cumprimentos, família, mercado, tempo, saúde, pedir e agradecer: frases montadas com o falante, gravadas por ele e marcadas como "verificado". O acervo do jw.org quase não tem esse vocabulário; o corpus de notícias do LIACC completa parte dele.
2. **Conversa guiada com o tutor.** O tutor conduz diálogos curtos usando só frases do corpus e do caderno. O aluno responde escolhendo, completando ou falando frases conhecidas.
3. **Roleplays do dia a dia.** Situações montadas com o falante (chegar a uma casa, apresentar-se, comprar algo, conversar depois da reunião), com as falas do outro lado já verificadas.
4. **Conversa livre.** Com o falante, nas sessões mensais. Com a IA, só quando o léxico verificado for grande; até lá, toda frase que a IA criar aparece como "hipótese" e vai para a fila do falante.

Sem falante, os degraus 1 e 3 ficam pequenos (só o que o corpus sustenta) e a conversa do dia a dia avança devagar.

---

## 8. A sessão diária de 20 minutos

**Dois cursos separados.** Inglês e emakhuwa são funções independentes no app, cada um com a própria sessão de 20 minutos, o próprio streak e o próprio avatar, como o ADR-002 já prevê com a gamificação por curso. O André faz os dois por dia.

A sessão mantém os cinco blocos do Fluente365, e o conteúdo do dia gira em torno de um único parágrafo-âncora.

| Minutos | Bloco           | Conteúdo                                                                                                                                                     |
| ------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0-3     | Aquecimento SRS | Cartões de frase e de palavra vencidos (máx. 20), com lacuna                                                                                                 |
| 3-8     | Decodificação   | Parágrafo-âncora em interlinear, narrado pelo tutor; um padrão gramatical descoberto com 6 a 10 frases de evidência; 3 a 4 exercícios (montar verbo, lacuna) |
| 8-15    | Input real      | Leitura-escuta do parágrafo (português visível, depois oculto); shadowing de 2 a 3 frases; ditado de 1 frase. Em dias alternados, vídeo (seção 7.2)          |
| 15-19   | Produção        | Seg/Qua/Sex: tradução reversa. Ter/Qui/Sáb: shadowing gravado, conversa guiada ou comentário preparado                                                       |
| 19-20   | Fechamento      | O tutor resume: o que entrou no SRS, cobertura do texto da semana, dúvidas novas para o falante                                                              |

- **Frases no nível certo.** Lições e exercícios usam frases em que o aluno já conhece de 85% a 95% das palavras; o restante é o desafio do dia. Quem escolhe é o `SegmentSelector`, código puro.
- **Coleta.** Durante a leitura, o aluno toca nas palavras que quer aprender. Se a entrada estiver "provável" ou acima, vira cartão na hora; senão, fica "em observação" e vira cartão quando subir de nível.
- **Dois modos de leitura.** No começo, o português fica visível enquanto o aluno ouve o emakhuwa. A partir do estágio N2, o padrão vira "ler antes de revelar": tentar entender o emakhuwa primeiro e só depois abrir o português. O aluno troca de modo quando quiser.
- **Domingo:** revisão estendida, teste da semana e um "parágrafo surpresa" (texto nunca visto, compreensão respondida em português). Fecha a lista de dúvidas da semana e mostra o relatório do léxico: quantas entradas subiram de nível e quantas foram contestadas.
- **Ritmo semanal:** nos primeiros meses, o texto diário; depois, um artigo por semana, de preferência o que será estudado na reunião.

---

## 9. Currículo em estágios

Sem CEFR nem Murphy para o emakhuwa, o currículo nasce do próprio corpus: a frequência decide o vocabulário, e a morfologia decide a ordem da gramática. Os estágios usam o prefixo **N** para não confundir com as fases **E**.

| Estágio                 | Período     | Foco                                                                                                                                   | Marco de saída                                                                                                |
| ----------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| N0 Sons e escrita       | Semanas 1-2 | Vogais curtas × longas, dígrafos sem equivalente no português (kh, ph, th, tt…), percepção de tom, saudações e expressões das reuniões | Ler um parágrafo em voz alta de forma inteligível, avaliado pelo falante                                      |
| N1 Nomes e concordância | Meses 1-3   | Classes nominais (singular/plural mais frequentes), concordância de adjetivos, possessivos e demonstrativos; lemas de maior frequência | Reconhecer a classe e o plural das palavras de um parágrafo novo                                              |
| N2 O verbo              | Meses 3-6   | Marcadores de sujeito, tempos e aspectos mais frequentes no corpus, negação, objeto                                                    | Decodificar sozinho a maioria das formas verbais de um parágrafo                                              |
| N3 Extensões e orações  | Meses 6-9   | Extensões verbais (aplicativo, causativo, passivo, recíproco), relativas, locativos, conectivos                                        | Entender o parágrafo de abertura de um artigo novo sem o português                                            |
| N4 Discurso e produção  | Meses 9-12  | Textos inteiros, foco e estrutura da informação, tom em contexto, comentários, apresentações e conversa do dia a dia                   | Comentário de 2-3 frases aprovado pelo falante; ideia central de um vídeo curto; conversa guiada de 3 minutos |

A ordem segue o que é típico de línguas bantas e precisa ser conferida com as notas gramaticais da SIL e com o falante antes do N1. As metas por estágio usam cobertura lexical (seção 10), não contagem de palavras; os números exatos saem do lote 1 (E2).

Cada estágio vira unidades em `content/syllabus/vmw/`, no mesmo formato de spec do inglês: objetivos, padrões-alvo com frases-evidência, vocabulário por frequência, erros típicos de falantes de português e critérios de domínio. Esse syllabus é escrito no chat (fase E11).

---

## 10. Modelo do aluno e métricas

A métrica principal é a cobertura lexical — que porcentagem das palavras de um texto real o aluno já domina — somada ao domínio por padrão gramatical, como no motor adaptativo do Fluente365.

- **Cobertura lexical.** Porcentagem das palavras de um texto novo cuja forma já está madura no SRS. A pesquisa clássica de leitura (Hu & Nation, 2000) aponta cerca de 98% para ler com conforto sem ajuda. O app mostra: "você já conhece X% do texto desta semana".
- **Domínio por padrão.** Reaproveita o `topicMastery` e a mesma regra: acerto ≥ 85% em ≥ 12 exercícios, distribuídos em ≥ 3 sessões.
- **Por habilidade:**
  - leitura = nota de compreensão em português;
  - escuta = ditado;
  - escrita = similaridade média na tradução reversa + aprovações do falante;
  - fala = avaliações do falante e autoavaliação.
- **Registro de erros.** Códigos próprios para quem fala português, por exemplo: concordância de classe trocada, vogal curta no lugar de longa, empréstimo do português sem adaptar, encaixe do verbo fora de ordem. A lista inicial é validada com o falante.
- **Marco trimestral.** Parágrafo surpresa + ditado + tradução reversa, sempre com textos novos.
- **Metas indicativas do léxico** (calibrar no lote 1): cerca de 300 entradas confirmadas em 3 meses, 700 em 6 e 1.500 em 12.
- **Qualidade da IA:** contestações abaixo de 5% das entradas confirmadas, zero frases em emakhuwa fora do corpus e a prova fixa do agente (seção 6.8) subindo de lote em lote.

---

## 11. O informante humano

Um falante fluente de emakhuwa, cerca de 30 minutos por semana, é o que transforma hipóteses da IA em conhecimento confiável — é a peça mais valiosa do módulo. Pode ser alguém de uma congregação de língua emakhuwa ou um contato de Nampula, por WhatsApp ou vídeo. **Situação em 30/10: ainda não há; o André vai procurar (fase E8).**

**Ciclo semanal:**

1. O app junta até 10 dúvidas da semana, priorizando as de maior impacto: palavras frequentes, entradas contestadas, padrões em aberto, produções marcadas como incertas.
2. Exporta uma mensagem numerada, pronta para colar no WhatsApp.
3. O falante responde por texto ou áudio. O André cola as respostas no app; a IA as estrutura e as entradas sobem para "verificado" (ou descem, se o falante corrigir).
4. O falante grava frases-chave, pares mínimos de tom e o caderno de frases do dia a dia (seção 7.3).
5. Uma vez por mês, 15 a 20 minutos de conversa para avaliar a fala.

**Sem informante,** o módulo funciona como curso de leitura e compreensão. O léxico para em "confirmado", sem chegar a "verificado", escrita e fala ficam sem validação externa, e a conversa do dia a dia avança devagar.

---

## 12. Integração técnica no Fluente365

O módulo entra como um segundo curso do Fluente365: reaproveita SRS, Session Player, avaliadores, streak, avatar, tutor e PWA, e acrescenta um domínio de corpus paralelo.

### 12.1 Três partes: coletor e processamento no servidor, laboratório, app

- **Coletor e processamento no servidor (worker).** Um serviço agendado com fila de tarefas, fora da Vercel por causa do tempo de execução. Monta o catálogo, baixa os arquivos, pareia os idiomas pelo número do documento. Na versão para convidados (fases A2 em diante), processa pela API (Opus 5.5) só o que o laboratório ainda não processou: alinha, analisa, corta áudio e roda a prova fixa. A chave da Anthropic fica só nas variáveis de ambiente do worker. Escreve na biblioteca com a chave `service_role`, que nunca sai do servidor.
- **Laboratório local (`lab/`).** Na fase de uso pessoal, faz o processamento do acervo (pré-pareamento, revisão do alinhamento, análise no contexto, corte de áudio, prova fixa) e o que é pesado ou experimental: voz sintética (MMS), alinhamento forçado de áudio, testes de reconhecimento de voz e o eventual ajuste fino de um modelo de tradução. Usa o **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) logado na conta Claude do André, consumindo o limite da assinatura, não a API; modelo Opus 5.5 em todas as tarefas; processa em lotes com ponto de retomada por documento e, quando o limite da assinatura acaba, pausa e continua sozinho depois; não guarda nenhuma chave da API. Grava no corpus com a `service_role`, guardada só em `lab/.env.local` (fora do Git) e nunca no app (ADR-005, ADR-006).
- **App de estudo (Fluente365).** Lê a biblioteca do curso `vmw`, guarda no Dexie só a parte que o aluno está estudando e chama a IA só pelo proxy `/api/tutor`.

### 12.2 Camadas

| Camada                           | O que entra                                                                                                                                                                                                                                                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/corpus/`             | Entidades `ParallelDocument`, `AlignedSentence`, `LexiconEntry`, `GrammarPattern`, `InformantQuestion`, `PhrasebookEntry`. Serviços puros: `TextNormalizer`, `SentenceAligner`, `WordAligner` (IBM Model 1), `CorpusGuard`, `EvidenceScorer`, `SegmentSelector`, `LexicalCoverage`, `ReverseTranslationScorer` (chrF) |
| `src/domain/corpus/ports/`       | `CorpusRepositoryPort`, `EpubReaderPort`, `MorphAnalyzerPort`, `CorpusTutorPort` (separado do `AiTutorPort`, pelo princípio I)                                                                                                                                                                                        |
| `src/application/corpus/`        | `import-parallel-publication`, `align-publication`, `build-lexicon`, `generate-corpus-session`, `evaluate-reverse-translation`, `compile-informant-questions`, `apply-informant-answers`, `answer-question`, `contest-entry`, `run-agent-eval`                                                                        |
| `src/infrastructure/`            | `supabase/` (repositórios do corpus), `local/` (cópia offline no Dexie), `epub/` (leitor de EPUB), `morph/` (regras do tokenizer portadas para TS), novas tarefas no proxy `/api/tutor` sem gravar texto em log                                                                                                       |
| `src/presentation/app/emakhuwa/` | Leitor paralelo com interlinear (tocar na palavra abre o dicionário), explorador de padrões, fila do informante, caderno de frases, sessão do curso                                                                                                                                                                   |
| `lab/`                           | Scripts do laboratório (seção 12.1)                                                                                                                                                                                                                                                                                   |

### 12.3 Travas em código puro

`TextNormalizer`, `CorpusGuard`, `EvidenceScorer` e `SegmentSelector`, com cobertura de testes de pelo menos 90%. São elas que garantem as regras das seções 6 a 8, não o prompt.

### 12.4 Multi-idioma (ADR-002) e o que muda

O ADR-002 já criou a tabela `courses` (flags `ai_level`, `audio`, `visibility`) e o `course_id` em todas as tabelas de aluno e de conteúdo. Para o emakhuwa:

1. `courses.audio` passa a aceitar também `'downloaded'` (áudio oficial baixado e cortado, mais a voz do tutor).
2. É semeado o curso `vmw`: nome "Emakhuwa", `ai_level = 'corpus_only'`, `audio = 'downloaded'`, `visibility = 'owner_only'`.
3. Paga-se a dívida do ADR-002: `courseId` passa pelos ports e casos de uso, e o default `'en'` sai antes de ativar o curso `vmw` para o usuário.
4. O planner lê as flags do curso: com `corpus_only`, só usa frases do corpus e o `CorpusGuard`; com `downloaded`, agenda ditado e shadowing com o áudio oficial.
5. O `SpeechPort` verifica capacidade. A Web Speech API do navegador não fala nem reconhece emakhuwa; a voz vem do áudio oficial, do falante ou da voz sintética aprovada (seção 6.7), e o reconhecimento só entra se o teste da E3 aprovar.
6. Feature flag `module_vmw` liberada só para a conta do André.

### 12.5 Dados

Todas as tabelas novas têm `user_id`, `course_id`, RLS por `user_id` e exigem curso visível (policies do ADR-002). A migration real é da fase E1; o resumo abaixo é a referência.

| Tabela                | Conteúdo principal                                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corpus_documents`    | Par de publicação: tipo (texto diário, artigo, folheto, Bíblia, vídeo, manual), referência de origem, títulos, parágrafos PT e vmw, status do processamento |
| `corpus_segments`     | Frase alinhada: parágrafo, posição, texto vmw, texto PT, texto normalizado, nota de alinhamento                                                             |
| `corpus_media`        | Áudio ou vídeo no Storage privado: documento, idioma, tipo, duração, legenda                                                                                |
| `media_clips`         | Trecho com tempo de início e fim ligado a um segmento (áudio por parágrafo ou frase)                                                                        |
| `lexicon_entries`     | Forma, forma normalizada, sentidos, raiz proposta, status (6 níveis), ocorrências, documentos distintos, contestações                                       |
| `lexicon_evidence`    | Cada ocorrência que sustenta ou contradiz uma entrada                                                                                                       |
| `grammar_patterns`    | Padrão, explicação em PT, segmentos de exemplo, status, frequência                                                                                          |
| `informant_questions` | Dúvida, origem, prioridade, resposta do falante, data                                                                                                       |
| `phrasebook_entries`  | Caderno de frases do dia a dia: frase vmw, PT, situação, gravação, status                                                                                   |
| `agent_eval_runs`     | Resultado da prova fixa por lote                                                                                                                            |
| `corpus_lessons`      | Lições geradas (cache), com versão do prompt                                                                                                                |

O Storage usa um bucket privado (por exemplo, `vmw-media`) com policy por `user_id`. Reaproveitadas com `course_id = 'vmw'`: `srs_cards`, `topic_mastery`, `error_log`, `study_sessions`, `gamification` e `admin_costs`.

### 12.6 Contratos centrais (rascunho)

```ts
export type LexiconStatus =
  "official" | "verified" | "confirmed" | "probable" | "hypothesis" | "contested";

export interface AlignedSentence {
  id: string;
  docId: string;
  paragraphNo: number;
  target: string; // emakhuwa
  source: string; // português
  alignmentScore: number; // 0..1; abaixo de 0,7 fica fora dos exercícios
}

export interface LexiconEntry {
  form: string; // palavra como aparece no texto
  rootGuess?: string; // agrupa formas em famílias
  senses: string[];
  evidenceIds: string[];
  occurrences: number;
  distinctDocs: number;
  contestCount: number;
  status: LexiconStatus;
}

// domain/corpus/services — puros, testados
export interface CorpusGuard {
  /** Strings em emakhuwa que NÃO existem no corpus. Lista vazia = aprovado. */
  findUnknown(targetStrings: string[], corpus: NormalizedSegmentIndex): string[];
}
export interface EvidenceScorer {
  score(entry: LexiconEntry, evidence: Evidence[], t: Thresholds): LexiconStatus;
}
export interface SegmentSelector {
  /** Frases com 85-95% de palavras conhecidas e alinhamento >= minConfidence. */
  select(segments: AlignedSentence[], known: Set<string>, opts: SelectOptions): AlignedSentence[];
}

// domain/corpus/ports
export interface CorpusTutorPort {
  verifyAlignment(pair: AlignedSentence): Promise<AlignmentCheck>;
  gloss(s: AlignedSentence, examples: AlignedSentence[]): Promise<Gloss>;
  explainPattern(evidence: AlignedSentence[]): Promise<GrammarPattern>;
  gradeComprehension(answerPt: string, officialPt: string): Promise<EvaluationResult>;
  compareReverseTranslation(
    answer: string,
    original: AlignedSentence,
    examples: AlignedSentence[],
  ): Promise<EvaluationResult>;
  answer(question: string, evidence: RetrievedEvidence): Promise<TutorAnswer>; // sempre cita a fonte
  structureInformantAnswers(q: InformantQuestion[], reply: string): Promise<InformantAnswer[]>;
}
```

Novos tipos de exercício: `qual_traducao`, `read_before_reveal`, `morpheme_build`, `interlinear_match`, `tone_pair`, `reverse_translation`, `comprehension_pt`, `video_summary`, `prepared_comment`, `guided_dialogue` — todos devolvendo o mesmo `EvaluationResult`.

### 12.7 Prompts e definição de pronto do módulo

- **Prompts versionados** em `prompts/vmw/`: `agent` (manual do agente), `aligner`, `analyzer`, `lesson-builder`, `video-keypoints`. São escritos e testados no chat antes de irem para o código.
- **Pronto, no módulo, também quer dizer:**
  - nenhuma frase em emakhuwa chega à tela sem passar pelo `CorpusGuard`;
  - o status de cada entrada é decidido pelo `EvidenceScorer`;
  - toda tabela nova tem RLS e teste de isolamento;
  - nenhum conteúdo do jw.org entra no repositório.

### 12.8 Pontos que pedem confirmação do André (CLAUDE.md)

- Biblioteca para abrir EPUB (dependência nova).
- Licença do emakhuwa-tokenizer, antes de portar as regras.
- Dependências Python do laboratório (áudio e MMS).

---

## 13. Roadmap — fases E0 a E12

### 13.1 Ordem acelerada (decidida em 30/10)

O código começa já, em paralelo com a calibração. A base multi-idioma (F0.2, ADR-002) está pronta, e a primeira peça — o laboratório que monta a base do agente — não depende das telas do app. As telas entram quando a Fase 1 do inglês entregar o SRS, a persistência e o Session Player; o proxy `/api/tutor` (F2.1) pode ser antecipado.

| Fase | Tipo   | Depende de             | Entrega                                                                                          |
| ---- | ------ | ---------------------- | ------------------------------------------------------------------------------------------------ |
| E0   | chat   | —                      | Manual do agente e prompts v1, prova fixa, mapa das fontes em emakhuwa                           |
| E1   | código | F0.2                   | Tabelas do corpus, Storage privado, curso `vmw`, flag do módulo, dívida de `courseId` do ADR-002 |
| E2   | código | E0, E1                 | Laboratório + lote 1 + decisão de seguir ou parar                                                |
| E3   | código | E2                     | Lotes 2 e 3, áudio e vídeo, testes de reconhecimento e de voz sintética                          |
| E4   | código | E1, E2, F1.1, F1.4     | Leitor paralelo e dicionário vivo no app, com cartões SRS                                        |
| E5   | código | E2, F2.1               | Agente professor no app, com as ferramentas e o `CorpusGuard`                                    |
| E6   | código | E4, E5, F1.6           | Sessão diária do emakhuwa e exercícios                                                           |
| E7   | código | E3, E6                 | Vídeos "assistir e contar"                                                                       |
| E8   | você   | —                      | Encontrar o falante                                                                              |
| E9   | código | E6, E8                 | Fila do informante, caderno de frases, conversa guiada e roleplays                               |
| E10  | código | E3, E6, E8, F3.3, F4.3 | Tutor animado e voz no emakhuwa                                                                  |
| E11  | chat   | E2                     | Syllabus N0 a N4 e roteiros de conversa                                                          |
| E12  | código | E6, F4.6               | Imersão e exportação do léxico para o Anki                                                       |

### 13.2 Critérios de seguir ou parar (medidos no lote 1, fase E2)

Metas iniciais, ajustáveis:

- alinhamento certo em ≥ 95% das frases, conferido lendo o português;
- ≥ 70% das glosas plausíveis;
- ≥ 30 entradas "prováveis" depois de 30 textos diários.

Decisão do André: seguir, ajustar os prompts ou reduzir o papel da IA (nesse caso, as tarefas dela passam pelo falante e o roadmap continua o mesmo).

---

## 14. Custos, riscos e expectativas

**Política: qualidade primeiro** (ADENDO-v1.3). O agente usa o modelo mais capaz e todo o contexto que ajudar; o custo é medido e visível, sem teto. Se ficar caro, reduz-se depois, por configuração.

**Custo esperado, em ordem de grandeza** (Opus 5.5 a US$ 4 / 20 por milhão de tokens de entrada/saída — conferir na página oficial):

- **Texto:** por dia, glosa do parágrafo, um padrão, três traduções reversas, uma compreensão, vídeo em dias alternados e umas cinco perguntas ao agente, cada chamada com 20 a 50 frases de contexto — cerca de US$ 20 a 50 por mês.
- **Laboratório:** sem custo extra na fase pessoal, usa o limite da assinatura (ADR-006).
- **Voz:** cerca de US$ 1 a 5 por mês.

| Risco                                          | Mitigação                                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| IA errar emakhuwa com confiança                | Status decidido por código, botão de contestar, gabarito sempre oficial, prova fixa por lote, falante no ciclo                 |
| IA inventar frases em emakhuwa                 | `CorpusGuard` rejeita qualquer frase fora do corpus                                                                            |
| Uso do conteúdo fora dos termos                | Arquivos baixados pelo próprio André, corpus só na conta dele, sem raspagem, curso `owner_only`                                |
| Mistura de variantes                           | Só emakhuwa central; o importador recusa arquivos de outra variante                                                            |
| Tradução não literal confunde o alinhamento    | Alinhamento por frase, conferência de cobertura, pares abaixo de 0,7 fora dos exercícios                                       |
| Ortografia inconsistente                       | Normalização e tolerância na correção; dicionário guarda variantes de grafia                                                   |
| Tom não marcado na escrita                     | Treino perceptivo com áudio real; falante valida                                                                               |
| Vocabulário restrito ao domínio religioso      | Corpus aberto de notícias do LIACC e caderno de frases do dia a dia                                                            |
| Voz sintética pronunciar errado                | Áudio oficial primeiro; teste com o falante; selo e botão "pronúncia estranha"                                                 |
| Falta de informante                            | O módulo vira curso de leitura e compreensão; achar o falante antes da E9 e da E10                                             |
| Credenciais no computador                      | Laboratório sem chave da API (Agent SDK, ADR-006); `service_role` só no laboratório e no servidor, fora do Git, nunca no app   |
| Limite da assinatura acabar no meio de um lote | Ponto de retomada por documento; pausa e retomada automáticas; ordem sob demanda garante que o material da semana sai primeiro |
| Áudio difícil de alinhar ou reconhecer         | Cair para áudio por parágrafo e autoavaliação                                                                                  |

**Expectativa honesta.** O FSI estima cerca de 900 horas de aula para proficiência profissional em suaíli, a língua banta mais próxima com estimativa oficial. Vinte minutos por dia dão cerca de 120 horas por ano. Em 12 meses, a meta realista é a da seção 1. Reuniões, vídeos e leitura extra (Trilha de Imersão) aceleram bastante.

---

## 15. Decisões

Doze decisões tomadas pelo André em 29 e 30/10/2026; falta achar o falante.

- [x] **Variante:** Emakhuwa central (vmw), a base da norma e a que o jw.org chama de "Emakhuwa".
- [x] **Quem usa:** só o André, sem distribuir.
- [x] **IA sobre o acervo:** chamadas à API liberadas para o agente ler e ajudar, no uso pessoal.
- [x] **Custo:** qualidade primeiro, sem teto, inclusive na voz; medir nos primeiros meses e ajustar pelo uso real — vale também para o inglês (ADENDO-v1.3).
- [x] **Travas da v0.1:** `CorpusGuard`, regras de evidência, contestação, seletor de frases e conferência de cobertura mantidos.
- [x] **Banco de dados:** Supabase (ADR-001).
- [x] **Onde fica o corpus:** no Supabase, visível só para o André, com cópia offline no Dexie.
- [x] **Tutor e voz no módulo:** o tutor animado fala português e emakhuwa; a pronúncia em emakhuwa é validada pelo falante.
- [x] **Modelo:** Opus 5.5 em tudo; o Fable 5.1 fica fora, salvo um teste opcional no chat.
- [x] **Objetivo:** acompanhar reuniões, ler e também conversar no dia a dia — as quatro habilidades.
- [x] **Divisão com o inglês:** dois cursos separados, cada um com sessão, streak e avatar próprios; os dois por dia.
- [x] **Quando:** o mais rápido possível, começando pelo código, em paralelo com a calibração.
- [ ] **Informante:** ainda não há; o André vai procurar (E8). Necessário antes da E9 e da E10.

---

## 16. Versão com acervo autorizado

Com a autorização do jw.org, o módulo ganha quatro capacidades por cima do plano v1.0, sem mudar a pedagogia. Decisões de arquitetura no ADR-005.

### 16.1 Coleta automática

1. **Catálogo:** publicações, revistas e vídeos disponíveis em emakhuwa central e em português do Brasil, pelo mesmo serviço de links que o botão "Baixar" do site usa, ou pelo acesso que a organização indicar.
2. **Pareamento:** pelo número do documento, igual nos dois idiomas; pares sem correspondente ficam de fora.
3. **Download:** só arquivos públicos, com as regras de bom vizinho da seção 3.
4. **Vídeos:** MP4 e legendas dos dois idiomas, alinhados pelo tempo.
5. **Atualização semanal**, com prioridade para o material da reunião da semana.
6. **Prioridade de processamento:** textos diários, folhetos, cânticos, artigos de estudo e vídeos curtos primeiro; livros longos depois.

### 16.2 Biblioteca compartilhada

- **Comum a todos:** documentos, frases alinhadas, mídia cortada, transcrições, dicionário vivo e padrões gramaticais.
- **De cada aluno:** cartões SRS, domínio, erros, sessões, contestações e respostas do falante.
- Contestações de vários alunos somam e aceleram a fila do falante; uma confirmação vale para todos, com registro de quem confirmou.
- O primeiro aluno que precisa de um texto paga o processamento; os seguintes o recebem pronto.

### 16.3 Buscador e aulas automáticas

- Busca por tema (em português, no título e nas transcrições dos dois idiomas), duração, tipo e semana da reunião.
- Cada resultado mostra a cobertura lexical do aluno e a busca ordena pelos que estão entre 85% e 95%.
- Ao escolher um vídeo ou texto, o app monta a aula: palavras novas com evidências, "assistir e contar", cartões com o trecho de áudio e exercícios de lacuna, ditado e tradução reversa.

### 16.4 Agente com o acervo completo

- Mais evidência desde o início; índice semântico (pgvector) para achar o melhor exemplo paralelo.
- Ajuste fino opcional de um modelo aberto pequeno de tradução PT ↔ emakhuwa, como sugestor; `CorpusGuard` e falante continuam valendo.
- Prova fixa ampliada para cerca de 300 itens.

### 16.5 Distribuição

1. Família e amigos, por convite.
2. Quem aprende emakhuwa para servir em congregações de língua emakhuwa.
3. Outros idiomas, um por vez, cada um com seu falante (novo `course_id`, mesmo motor).

Sempre gratuito, com aviso fixo de que o app é independente e não oficial.

### 16.6 Custos (ordem de grandeza, Opus 5.5)

| Item                                                                                                                                                                                                                                                                                                 | Estimativa                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Processar o acervo Fase pessoal: sem custo extra, usa o limite da assinatura (o processamento leva dias ou semanas, em lotes). Versão para convidados: o worker usa a API (Opus 5.5) só para o que ainda não foi processado; o custo por documento é medido na fase pessoal antes de ligar o worker. |
| Atualização semanal                                                                                                                                                                                                                                                                                  | Poucos dólares por semana   |
| Worker do coletor                                                                                                                                                                                                                                                                                    | Cerca de US$ 5 a 20 por mês |
| IA ao vivo por aluno ativo                                                                                                                                                                                                                                                                           | Cerca de US$ 5 a 15 por mês |
| Voz do tutor por aluno ativo                                                                                                                                                                                                                                                                         | Cerca de US$ 1 a 5 por mês  |

Com muitos alunos, a política de qualidade primeiro é revista com a medição dos primeiros meses.

### 16.7 Riscos adicionais

| Risco                                             | Mitigação                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A organização restringir ou retirar a autorização | Retirada em até 7 dias (`takedown_requests`); cada parte desliga sozinha; a importação manual continua |
| O site mudar a forma de oferecer os arquivos      | Coletor por adaptadores; importação manual como reserva                                                |
| Erros da IA vistos por muita gente                | Contestações somadas, falantes em rede, `CorpusGuard`                                                  |
| Explicações confundidas com ensino da organização | Agente restrito à língua; aviso de app independente                                                    |
| Custo crescer com muitos alunos                   | Medição por aluno e por serviço; revisão da política                                                   |

### 16.8 Fases

As fases A0 a A5 do `fases.json` executam esta seção, por cima das fases E0 a E12. As fases E1, E2 e E4 já nascem prontas para a biblioteca compartilhada (sem migração depois).

---

## 17. Fontes

- [jw.org — Termos de Uso](https://www.jw.org/en/terms-of-use)
- [jw.org — JW Language descontinuado](https://www.jw.org/en/online-help/jw-language/)
- [jw.org — índice em emakhuwa (lista de variantes)](https://www.jw.org/vmw/Ebibilioteka/Indexes/)
- [Wikipedia — Makhuwa language](https://en.wikipedia.org/wiki/Makhuwa_language)
- [Oxford Guide to the Bantu Languages — Emakhuwa](https://academic.oup.com/book/61440/chapter/534774441)
- [Ali, Caines e Malavi (2021) — corpus paralelo português–emakhuwa](https://arxiv.org/pdf/2104.05753)
- [Ali, Cardoso e Sousa-Silva (2024) — FLORES+ português–emakhuwa](https://arxiv.org/html/2408.11457v1)
- [Ali et al. (2024) — recursos de PLN para emakhuwa (LIACC)](https://repositorio-aberto.up.pt/handle/10216/163622)
- [Aycock et al. (ICLR 2025) — LLMs e livros de gramática](https://arxiv.org/html/2409.19151v2)
- [Shaw et al. (2025) — limites da tradução "a partir de um livro"](https://arxiv.org/abs/2508.06665v1)
- [SIL — Notas gramaticais sobre Emakhuwa-Imeetto](https://publikationen.ub.uni-frankfurt.de/opus4/files/22344/SILMozambique_GramaticaisEmakhuwa.pdf)
- [SIL — Vocabulário de Emakhuwa Central](https://www.sil.org/resources/archives/42995)
- [emakhuwa-tokenizer (PyPI)](https://pypi.org/project/emakhuwa-tokenizer/)
- [Meta MMS-TTS emakhuwa (Hugging Face)](https://huggingface.co/facebook/mms-tts-vmw/commits/main)
- [Pimsleur — tabela de dificuldade do FSI](https://www.pimsleur.com/are-there-easy-and-hard-languages/)

_Fim do documento. Próximo passo: fase E0 no chat (manual do agente, prompts e prova fixa) em paralelo com a E1 no código._
