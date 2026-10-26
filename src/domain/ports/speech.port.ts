/** So ouve; falar e do VoicePort (ADR-003). */
export interface SpeechPort {
  isRecognitionAvailable(): boolean;
  /** Resolve com a transcricao do que o aluno falou. */
  listen(timeoutMs: number): Promise<string>;
}
