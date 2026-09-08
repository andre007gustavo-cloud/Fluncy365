import type { Lesson, UnitSpec } from "../entities/lesson";
import type { FeedbackItem } from "../entities/exercise";
import type { StudentSnapshot } from "../entities/student";
import type { CefrLevel } from "../value-objects/cefr-level";

export interface WritingSubmission {
  readonly promptEn: string;
  readonly textEn: string;
  readonly targetLevel: CefrLevel;
  readonly profile: StudentSnapshot;
}

export interface WritingFeedback {
  /** Rubrica 0-5 por criterio (secao 9.4). */
  readonly scores: {
    readonly content: number;
    readonly grammar: number;
    readonly vocabulary: number;
  };
  readonly items: readonly FeedbackItem[];
  readonly correctedText: string;
  readonly praisePt: string;
  readonly nextStepPt: string;
  readonly suggestedSrsItems: readonly { readonly front: string; readonly back: string }[];
  readonly errorCodes: readonly string[];
}

export interface SpeechSubmission {
  readonly targetEn: string;
  readonly transcriptEn: string;
  readonly profile: StudentSnapshot;
}

export interface SpeechFeedback {
  readonly intelligibility: number;
  readonly items: readonly FeedbackItem[];
  readonly errorCodes: readonly string[];
}

export interface ErrorSummary {
  readonly codes: readonly string[];
  readonly examples: readonly string[];
  readonly accuracy: number;
}

export interface ConversationState {
  readonly topicId: string;
  readonly history: readonly { readonly role: "tutor" | "student"; readonly text: string }[];
  readonly profile: StudentSnapshot;
}

export interface TutorTurn {
  readonly replyEn: string;
  readonly recast: string | null;
  readonly errorCodes: readonly string[];
}

/**
 * Unico contrato que o dominio conhece sobre IA. A implementacao real fala com
 * o proxy /api/tutor - nunca com a Anthropic direto do cliente (secao 9.5).
 */
export interface AiTutorPort {
  generateLesson(spec: UnitSpec, profile: StudentSnapshot): Promise<Lesson>;
  reviewWriting(input: WritingSubmission): Promise<WritingFeedback>;
  coachSpeech(input: SpeechSubmission): Promise<SpeechFeedback>;
  remediate(topicId: string, errors: ErrorSummary): Promise<Lesson>;
  converse(state: ConversationState, userTurn: string): Promise<TutorTurn>;
}
