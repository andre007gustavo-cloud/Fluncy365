# ADR-003 — Tutor animado com voz natural

- **Data:** 2026-10-23
- **Status:** Aceita (escopo). O fornecedor de voz e o teto de custo de voz serão confirmados na Fase 3, com o teste cego e a medição real.
- **Contexto:** o plano v1.1 usava a Web Speech API do navegador para toda a voz. Ela é gratuita, mas robótica e diferente em cada aparelho. A conversa com o tutor só existia na Fase 5, com essa mesma voz. O dono do projeto pediu um **tutor em forma de personagem animado, com voz natural, que explica e conversa**, no estilo do Praktika, **dentro da v1**. Esse tutor é um personagem **separado** do avatar evolutivo do aluno (seção 10 do plano).

## Decisão

### 1. Dois personagens, papéis diferentes

|                   | Tutor                                                    | Avatar do aluno                            |
| ----------------- | -------------------------------------------------------- | ------------------------------------------ |
| Quem é            | O professor                                              | O próprio aluno                            |
| Muda com o tempo? | Não: identidade fixa                                     | Sim: 7 estágios por domínio comprovado     |
| Fala?             | Sim, com voz natural e boca sincronizada                 | Não                                        |
| Onde aparece      | Onboarding, lição do dia, produção, fechamento, conversa | Fechamento, tela do avatar, mural da turma |

### 2. Voz atrás de uma porta (`VoicePort`)

Três adaptadores, trocáveis por configuração, sem mexer no domínio:

- `FishAudioVoice`: **padrão**. É o melhor custo, tem streaming por WebSocket e o mesmo fornecedor também transcreve fala.
- `ElevenLabsVoice`: alternativa com vozes premium. Devolve a marcação de tempo de cada trecho falado, útil para sincronia labial fina.
- `WebSpeechVoice`: reserva gratuita, usada offline, no kill-switch e quando não há rede.

O fornecedor definitivo sai de um **teste cego** na Fase 3, com a **mesma voz** falando português (explicações para iniciantes) e inglês (exemplos e conversa).

### 3. Cache de áudio compartilhado

Todo texto fixo (explicação da lição, enunciados, cumprimentos, modelos de feedback) é sintetizado **uma vez**, salvo no Supabase Storage e reaproveitado por todos os alunos. É o mesmo princípio do ContentGenerator (seção 9.3). A chave do cache é um hash de texto + idioma + voz + modelo. Só a conversa ao vivo e o feedback individual geram custo por aluno.

### 4. Personagem 2D em SVG por camadas, animado por código

Rosto, olhos que piscam, sobrancelhas, **6 formatos de boca + repouso** e expressões. Uma máquina de estados controla o personagem: `idle`, `listening`, `thinking`, `speaking`, `celebrating`, `encouraging`. É a mesma tecnologia do avatar do aluno (SVG + Framer Motion), o que mantém tudo construível pelo Claude Code.

O Rive fica no backlog. Ele dá animação mais rica, mas o personagem precisa ser desenhado no editor visual do Rive por uma pessoa, fora do alcance dos agentes.

### 5. Sincronia labial em duas etapas

- **v1 (Fase 4):** a boca segue a **amplitude do áudio** (Web Audio `AnalyserNode`). Funciona com qualquer fornecedor, inclusive com o áudio em cache e offline.
- **v2 (Fase 5):** os formatos de boca são calculados a partir da **marcação de tempo** quando o fornecedor a devolve. Sem marcação, continua por amplitude.

### 6. Proxy `/api/voz`

Irmão do `/api/tutor`. Ele:

- valida a sessão do Supabase;
- consulta o cache antes de sintetizar;
- aplica a **cota diária de fala do tutor na conversa** (padrão: 10 min por aluno, configurável; esgotada a cota, a conversa segue em texto);
- registra caracteres e custo em `admin_costs` (`by_service`: `tts` e `stt`);
- guarda as chaves dos fornecedores só no servidor.

### 7. Fala do aluno (STT)

Web Speech onde existir. No iPhone, e onde ela falhar, o áudio vai ao proxy para transcrição pela API do fornecedor. Isso concretiza o fallback de iOS que a Fase 3 já previa. O `SpeechPort` existente passa a cuidar só de **ouvir**; **falar** fica com o `VoicePort` (o "I" do SOLID).

### 8. Legendas sempre

Tudo que o tutor fala aparece escrito (RNF06). O aluno pode silenciar o tutor sem perder conteúdo.

### 9. Turnos curtos no modo conversa

O prompt do ConversationTutor passa a exigir respostas faláveis: 1 a 3 frases por turno, sem listas, marcação ou emojis.

## Alternativas consideradas

| Opção                                       | Por que não                                                                                                                         |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Só Web Speech API (plano v1.1)              | Voz robótica e diferente em cada aparelho; não sustenta um personagem com identidade. Fica como reserva.                            |
| Avatar em vídeo realista de serviço externo | Custo por minuto alto e dependência de um fornecedor; o estilo realista pode parecer estranho.                                      |
| Avatar 3D (three.js, como o TalkingHead)    | Mais pesado no celular e mais difícil de produzir; pouco ganho num app de 20 min/dia.                                               |
| Rive (2D com editor visual)                 | Ótima qualidade, mas o personagem precisa ser desenhado à mão no editor do Rive. Fica no backlog.                                   |
| **SVG em camadas + `VoicePort` + cache**    | **Escolhida.** Barata, construível pelos agentes, funciona offline com o áudio em cache e troca de fornecedor sem mexer no domínio. |

## Custos de voz

Conversão usada: **1 minuto de fala ≈ 1.000 caracteres** (estimativa conservadora). Preços consultados em outubro/2026; **verificar sempre as páginas oficiais**.

| Fornecedor e modelo      | Preço                            | ≈ por minuto falado |
| ------------------------ | -------------------------------- | ------------------- |
| Fish Audio S2.1 Pro      | US$ 15 por milhão de bytes UTF-8 | ~US$ 0,015          |
| ElevenLabs Flash         | US$ 0,04 por mil caracteres      | ~US$ 0,04           |
| ElevenLabs v3 / v4       | US$ 0,08 por mil caracteres      | ~US$ 0,08           |
| Fish Audio — transcrição | US$ 0,36 por hora de áudio       | ~US$ 0,006          |

A Fish cobra por **byte**. Em português, letras acentuadas ocupam 2 bytes, o que encarece as falas em português em poucos por cento.

**Por aluno ativo/mês** (suposição de uso: 12 conversas × 5 min de fala do tutor):

| Uso                                        | Fish Audio           | ElevenLabs Flash     |
| ------------------------------------------ | -------------------- | -------------------- |
| Conversa (60 min de fala do tutor)         | ~US$ 0,90            | ~US$ 2,40            |
| Feedback individual falado (~10 min)       | ~US$ 0,15            | ~US$ 0,40            |
| Transcrição no iPhone (até 1 h, pela Fish) | até ~US$ 0,36        | até ~US$ 0,36        |
| **Total**                                  | **~US$ 1,05 a 1,40** | **~US$ 2,80 a 3,15** |

**Conteúdo fixo (cache, pago uma vez para todos):** o currículo de 12 meses tem ~288 lições. Com ~1.500 caracteres por lição (explicação + enunciados), são ~430 mil caracteres: ~US$ 6,50 na Fish, ~US$ 17 no ElevenLabs Flash e ~US$ 35 no v4, no total. Rateado entre os alunos, é desprezível.

**Teto:** substituído pelo [ADENDO-v1.3](./ADENDO-v1.3.md) (qualidade primeiro): o custo de voz é medido e visível por aluno e por serviço, sem teto na v1, e a cota de fala vira cota alta de segurança, só contra loops. O resto deste ADR continua valendo.

**Para 15 alunos:** IA de texto ~US$ 5-12/mês + voz ~US$ 16-21/mês na Fish ≈ **US$ 21-33/mês**. Com o ElevenLabs Flash, a voz sobe para ~US$ 42-47/mês.

## Consequências

### O que muda no PLANEJAMENTO.md (v1.2)

- **1.2** — o tutor entra na proposta.
- **3.2 / 3.3** — novo RF14; RNF03 (chaves de voz só no servidor), RNF04 (teto de voz separado) e RNF06 (legendas).
- **4.1 / 4.9** — o tutor no onboarding e uma seção própria sobre ele.
- **6** — o tutor narra a lição do dia, comenta a produção e faz o fechamento.
- **9.2 / 9.6** — serviço de voz na tabela e seção da voz do tutor.
- **10.1** — o avatar não é o tutor.
- **11** — stack, pastas, SOLID e fluxo da fala do tutor.
- **12** — tabela `tutor_audio_cache`; `admin_costs` registra voz.
- **13** — contratos `VoicePort`, `TutorState` e `MouthShape`.
- **14.4** — custos de voz.
- **15** — tarefas novas nas Fases 3, 4 e 5; linha do tempo de ~21-25 para ~24-29 semanas.
- **16 / 17 / 19** — riscos, métricas e backlog.

### O que não muda

- Pedagogia, currículo, motor adaptativo, avatar do aluno e os contratos existentes.
- **Módulo emakhuwa:** sem mudança. Se o tutor aparecer lá no futuro, fala só português e **nunca pronuncia emakhuwa**: nenhum motor de voz conhece a língua, e a pronúncia sairia inventada, contra o princípio do `CorpusGuard`.

### Dívida assumida

- A qualidade do personagem depende do design inicial em SVG, feito no chat antes da Fase 4.
- Dependência de um fornecedor externo de voz, mitigada pela porta e pela reserva da Web Speech.

## Fontes (consultadas em outubro/2026)

- Praktika — tutor em avatar que conversa e corrige a fala: https://tooldirectory.ai/tools/praktika
- ElevenLabs — corte de 20% nos preços da API e lançamento do v4 (05/10/2026): https://www.usagepricing.com/blueprint/activity/elevenlabs-2026-10-05-v4-launch-tts-price-cut
- Fish Audio — API a US$ 15 por milhão de bytes, streaming por WebSocket: https://fish.audio/en/developers/
- Fish Audio — transcrição a US$ 0,36 por hora: https://costbench.com/software/voice-apis/fish-audio/
- ElevenLabs — marcação de tempo para sincronia labial: https://www.abratabia.com/ai-talking-characters/ai-voice.php
- Sincronia por amplitude (AnalyserNode) e 6 formatos de boca: https://github.com/petry-projects/TalkTerm/discussions/365
- TalkingHead (alternativa 3D): https://github.com/StephanWald/TalkingHead
