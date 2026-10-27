export type TutorState =
  "idle" | "listening" | "thinking" | "speaking" | "celebrating" | "encouraging";

// ADR-003 item 4: 6 formatos de boca mais o repouso.
export type MouthShape = "rest" | "A" | "E" | "O" | "U" | "MBP" | "FV";
