import { describe, expectTypeOf, it } from "vitest";
import type { EvaluationResult, ExerciseKind, SrsSignal } from "../entities/exercise";
import type { ReviewQuality } from "../entities/srs-card";
import type { MouthShape, TutorState } from "../entities/tutor";
import type { CefrLevel } from "../value-objects/cefr-level";
import type { Skill } from "../value-objects/skill";
import type { AiTutorPort } from "./ai-tutor.port";
import type { ExerciseEvaluator } from "./exercise-evaluator.port";
import type { SpeechPort } from "./speech.port";
import type { SpeechChunk, SpeechRequest, SynthesizedSpeech, VoicePort } from "./voice.port";
import type { SrsScheduler } from "../services/srs-scheduler";

type Section13Kinds =
  | "multiple_choice"
  | "gap_fill"
  | "reorder"
  | "match"
  | "dictation"
  | "open_writing"
  | "translation"
  | "read_aloud";

describe("contratos da secao 13", () => {
  it("mantem os tipos centrais estaveis", () => {
    expectTypeOf<Section13Kinds>().toExtend<ExerciseKind>();
    expectTypeOf<"true_false">().toExtend<ExerciseKind>();
    expectTypeOf<EvaluationResult["correct"]>().toEqualTypeOf<boolean | null>();
    expectTypeOf<SrsSignal["quality"]>().toEqualTypeOf<0 | 1 | 2 | 3 | 4 | 5>();
    expectTypeOf<ExerciseEvaluator["supports"]>().parameters.toEqualTypeOf<[ExerciseKind]>();
    expectTypeOf<keyof AiTutorPort>().toEqualTypeOf<
      "generateLesson" | "reviewWriting" | "coachSpeech" | "remediate" | "converse"
    >();
    expectTypeOf<keyof SrsScheduler>().toEqualTypeOf<"review" | "dueCards">();
    expectTypeOf<Parameters<SrsScheduler["review"]>[1]>().toEqualTypeOf<ReviewQuality>();
    expectTypeOf<Skill>().toEqualTypeOf<"reading" | "listening" | "writing" | "speaking">();
    expectTypeOf<CefrLevel>().toEqualTypeOf<number>();
    expectTypeOf<TutorState>().toEqualTypeOf<
      "idle" | "listening" | "thinking" | "speaking" | "celebrating" | "encouraging"
    >();
    expectTypeOf<MouthShape>().toEqualTypeOf<"rest" | "A" | "E" | "O" | "U" | "MBP" | "FV">();
    expectTypeOf<keyof VoicePort>().toEqualTypeOf<"synthesize" | "stream">();
    expectTypeOf<ReturnType<VoicePort["stream"]>>().toExtend<AsyncIterable<SpeechChunk>>();
    expectTypeOf<SpeechRequest["lang"]>().toEqualTypeOf<"pt-BR" | "en-US">();
    expectTypeOf<SynthesizedSpeech["provider"]>().toEqualTypeOf<
      "fish" | "elevenlabs" | "webspeech"
    >();
    expectTypeOf<keyof SpeechPort>().toEqualTypeOf<"isRecognitionAvailable" | "listen">();
  });
});
