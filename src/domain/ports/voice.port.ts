export interface WordTiming {
  readonly word: string;
  readonly startMs: number;
  readonly endMs: number;
}

export interface SpeechRequest {
  readonly text: string;
  readonly lang: "pt-BR" | "en-US";
  /** Voz do tutor (configuracao). */
  readonly voiceId: string;
  /** Texto fixo: pode usar o cache compartilhado. */
  readonly cacheable: boolean;
}

export interface SynthesizedSpeech {
  /** Storage (cache) ou blob local. */
  readonly audioUrl: string;
  readonly durationMs: number;
  /** Presente quando o fornecedor devolve. */
  readonly wordTimings?: readonly WordTiming[];
  readonly provider: "fish" | "elevenlabs" | "webspeech";
  /** Para o log de custo. */
  readonly chars: number;
}

export interface SpeechChunk {
  readonly audio: Uint8Array;
  readonly wordTimings?: readonly WordTiming[];
}

/** So fala; nao sabe de IA nem de banco (ADR-003). */
export interface VoicePort {
  synthesize(req: SpeechRequest): Promise<SynthesizedSpeech>;
  /** Modo conversa. */
  stream(req: SpeechRequest): AsyncIterable<SpeechChunk>;
}
