/**
 * Tipos do banco. Depois de qualquer migracao, regere com:
 *   npx supabase gen types typescript --project-id <id> > src/infrastructure/supabase/database.types.ts
 * Ate a Fase 1 estes tipos sao mantidos a mao e cobrem apenas o que o app usa.
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

/**
 * As linhas abaixo precisam ser `type`, nunca `interface`: o Supabase exige que
 * cada Row satisfaca Record<string, unknown>, e interfaces nao ganham indice
 * implicito em TypeScript. Com `interface` todas as queries viram `never`.
 */

export type Skill = "reading" | "listening" | "writing" | "speaking";
export type TopicStatusRow = "locked" | "learning" | "review" | "mastered";
export type SrsItemTypeRow = "word" | "phrase" | "structure";
export type LessonStatusRow = "seed" | "auto" | "approved";
export type JwRefTypeRow = "article" | "audio" | "video";

export type SrsCardRow = {
  id: string;
  user_id: string;
  front: string;
  back: string;
  type: SrsItemTypeRow;
  ease: number;
  interval_days: number;
  due_at: string;
  lapses: number;
  source_lesson_id: string | null;
  created_at: string;
};

export type StudentModelRow = {
  user_id: string;
  levels: Record<Skill, number>;
  vocab_size: number;
  pace: { avgSecondsPerExercise: number; sessionCompletionRate: number; usualHour: number | null };
  updated_at: string;
};

export type GamificationRow = {
  user_id: string;
  xp_total: number;
  evolution_xp: number;
  avatar_stage: number;
  unlocked_traits: string[];
  streak: { current: number; best: number; shieldsLeft: number; lastDay: string | null };
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  name: string;
  settings: Json;
  created_at: string;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      student_models: {
        Row: StudentModelRow;
        Insert: Partial<StudentModelRow> & { user_id: string };
        Update: Partial<StudentModelRow>;
        Relationships: [];
      };
      srs_cards: {
        Row: SrsCardRow;
        Insert: Omit<SrsCardRow, "id" | "created_at"> & { id?: string };
        Update: Partial<SrsCardRow>;
        Relationships: [];
      };
      gamification: {
        Row: GamificationRow;
        Insert: Partial<GamificationRow> & { user_id: string };
        Update: Partial<GamificationRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      skill: Skill;
      topic_status: TopicStatusRow;
      srs_item_type: SrsItemTypeRow;
      lesson_status: LessonStatusRow;
      jw_ref_type: JwRefTypeRow;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
