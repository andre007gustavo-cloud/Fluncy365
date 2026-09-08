/** Sintese e reconhecimento de voz. Nao sabe nada sobre IA (principio I). */
export interface SpeechPort {
  isRecognitionAvailable(): boolean;
  isSynthesisAvailable(): boolean;
  speak(textEn: string, rate?: number): Promise<void>;
  /** Resolve com a transcricao do que o aluno falou. */
  listen(timeoutMs: number): Promise<string>;
}
