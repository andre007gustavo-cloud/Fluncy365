export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      admin_costs: {
        Row: {
          by_service: Json;
          calls: number;
          course_id: string;
          day: string;
          input_tokens: number;
          output_tokens: number;
          usd: number;
        };
        Insert: {
          by_service?: Json;
          calls?: number;
          course_id?: string;
          day: string;
          input_tokens?: number;
          output_tokens?: number;
          usd?: number;
        };
        Update: {
          by_service?: Json;
          calls?: number;
          course_id?: string;
          day?: string;
          input_tokens?: number;
          output_tokens?: number;
          usd?: number;
        };
        Relationships: [
          {
            foreignKeyName: "admin_costs_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      content_jw_refs: {
        Row: {
          course_id: string;
          id: string;
          level: number;
          minutes: number;
          title: string;
          topics: string[];
          type: Database["public"]["Enums"]["jw_ref_type"];
          url: string;
        };
        Insert: {
          course_id?: string;
          id: string;
          level: number;
          minutes: number;
          title: string;
          topics?: string[];
          type: Database["public"]["Enums"]["jw_ref_type"];
          url: string;
        };
        Update: {
          course_id?: string;
          id?: string;
          level?: number;
          minutes?: number;
          title?: string;
          topics?: string[];
          type?: Database["public"]["Enums"]["jw_ref_type"];
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_jw_refs_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      content_lessons: {
        Row: {
          blocks: Json;
          course_id: string;
          created_at: string;
          day_index: number;
          exercises: Json;
          generated_by: string | null;
          id: string;
          reviewed_at: string | null;
          status: Database["public"]["Enums"]["lesson_status"];
          unit_id: string;
          version: number;
        };
        Insert: {
          blocks?: Json;
          course_id?: string;
          created_at?: string;
          day_index: number;
          exercises?: Json;
          generated_by?: string | null;
          id: string;
          reviewed_at?: string | null;
          status?: Database["public"]["Enums"]["lesson_status"];
          unit_id: string;
          version?: number;
        };
        Update: {
          blocks?: Json;
          course_id?: string;
          created_at?: string;
          day_index?: number;
          exercises?: Json;
          generated_by?: string | null;
          id?: string;
          reviewed_at?: string | null;
          status?: Database["public"]["Enums"]["lesson_status"];
          unit_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "content_lessons_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_lessons_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "content_units";
            referencedColumns: ["id"];
          },
        ];
      };
      content_units: {
        Row: {
          course_id: string;
          grammar_topics: string[];
          id: string;
          jw_refs: string[];
          level: number;
          mastery_criteria: Json;
          month: number;
          murphy_ref: string | null;
          pt_error_targets: string[];
          vocab_list: string[];
          week: number;
        };
        Insert: {
          course_id?: string;
          grammar_topics?: string[];
          id: string;
          jw_refs?: string[];
          level: number;
          mastery_criteria?: Json;
          month: number;
          murphy_ref?: string | null;
          pt_error_targets?: string[];
          vocab_list?: string[];
          week: number;
        };
        Update: {
          course_id?: string;
          grammar_topics?: string[];
          id?: string;
          jw_refs?: string[];
          level?: number;
          mastery_criteria?: Json;
          month?: number;
          murphy_ref?: string | null;
          pt_error_targets?: string[];
          vocab_list?: string[];
          week?: number;
        };
        Relationships: [
          {
            foreignKeyName: "content_units_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          ai_level: string;
          audio: string;
          id: string;
          name: string;
          visibility: string;
        };
        Insert: {
          ai_level: string;
          audio: string;
          id: string;
          name: string;
          visibility: string;
        };
        Update: {
          ai_level?: string;
          audio?: string;
          id?: string;
          name?: string;
          visibility?: string;
        };
        Relationships: [];
      };
      error_log: {
        Row: {
          code: string;
          count: number;
          course_id: string;
          example: string;
          last_at: string;
          skill: Database["public"]["Enums"]["skill"];
          user_id: string;
        };
        Insert: {
          code: string;
          count?: number;
          course_id?: string;
          example?: string;
          last_at?: string;
          skill: Database["public"]["Enums"]["skill"];
          user_id: string;
        };
        Update: {
          code?: string;
          count?: number;
          course_id?: string;
          example?: string;
          last_at?: string;
          skill?: Database["public"]["Enums"]["skill"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "error_log_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      gamification: {
        Row: {
          avatar_stage: number;
          course_id: string;
          evolution_xp: number;
          streak: Json;
          unlocked_traits: string[];
          updated_at: string;
          user_id: string;
          xp_total: number;
        };
        Insert: {
          avatar_stage?: number;
          course_id?: string;
          evolution_xp?: number;
          streak?: Json;
          unlocked_traits?: string[];
          updated_at?: string;
          user_id: string;
          xp_total?: number;
        };
        Update: {
          avatar_stage?: number;
          course_id?: string;
          evolution_xp?: number;
          streak?: Json;
          unlocked_traits?: string[];
          updated_at?: string;
          user_id?: string;
          xp_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "gamification_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          settings: Json;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          name?: string;
          settings?: Json;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          settings?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      srs_cards: {
        Row: {
          back: string;
          course_id: string;
          created_at: string;
          due_at: string;
          ease: number;
          front: string;
          id: string;
          interval_days: number;
          lapses: number;
          source_lesson_id: string | null;
          type: Database["public"]["Enums"]["srs_item_type"];
          user_id: string;
        };
        Insert: {
          back: string;
          course_id?: string;
          created_at?: string;
          due_at?: string;
          ease?: number;
          front: string;
          id?: string;
          interval_days?: number;
          lapses?: number;
          source_lesson_id?: string | null;
          type?: Database["public"]["Enums"]["srs_item_type"];
          user_id: string;
        };
        Update: {
          back?: string;
          course_id?: string;
          created_at?: string;
          due_at?: string;
          ease?: number;
          front?: string;
          id?: string;
          interval_days?: number;
          lapses?: number;
          source_lesson_id?: string | null;
          type?: Database["public"]["Enums"]["srs_item_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "srs_cards_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      student_models: {
        Row: {
          course_id: string;
          levels: Json;
          pace: Json;
          updated_at: string;
          user_id: string;
          vocab_size: number;
        };
        Insert: {
          course_id?: string;
          levels?: Json;
          pace?: Json;
          updated_at?: string;
          user_id: string;
          vocab_size?: number;
        };
        Update: {
          course_id?: string;
          levels?: Json;
          pace?: Json;
          updated_at?: string;
          user_id?: string;
          vocab_size?: number;
        };
        Relationships: [
          {
            foreignKeyName: "student_models_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      study_sessions: {
        Row: {
          completed: boolean;
          course_id: string;
          day: string;
          duration_sec: number;
          plan: Json;
          rescue: boolean;
          results: Json;
          updated_at: string;
          user_id: string;
          xp: number;
        };
        Insert: {
          completed?: boolean;
          course_id?: string;
          day: string;
          duration_sec?: number;
          plan?: Json;
          rescue?: boolean;
          results?: Json;
          updated_at?: string;
          user_id: string;
          xp?: number;
        };
        Update: {
          completed?: boolean;
          course_id?: string;
          day?: string;
          duration_sec?: number;
          plan?: Json;
          rescue?: boolean;
          results?: Json;
          updated_at?: string;
          user_id?: string;
          xp?: number;
        };
        Relationships: [
          {
            foreignKeyName: "study_sessions_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      topic_mastery: {
        Row: {
          accuracy: number;
          attempts: number;
          course_id: string;
          last_seen: string | null;
          sessions: number;
          status: Database["public"]["Enums"]["topic_status"];
          topic_id: string;
          user_id: string;
        };
        Insert: {
          accuracy?: number;
          attempts?: number;
          course_id?: string;
          last_seen?: string | null;
          sessions?: number;
          status?: Database["public"]["Enums"]["topic_status"];
          topic_id: string;
          user_id: string;
        };
        Update: {
          accuracy?: number;
          attempts?: number;
          course_id?: string;
          last_seen?: string | null;
          sessions?: number;
          status?: Database["public"]["Enums"]["topic_status"];
          topic_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "topic_mastery_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: { Args: never; Returns: boolean };
      tables_without_rls: { Args: never; Returns: string[] };
    };
    Enums: {
      jw_ref_type: "article" | "audio" | "video";
      lesson_status: "seed" | "auto" | "approved";
      skill: "reading" | "listening" | "writing" | "speaking";
      srs_item_type: "word" | "phrase" | "structure";
      topic_status: "locked" | "learning" | "review" | "mastered";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      jw_ref_type: ["article", "audio", "video"],
      lesson_status: ["seed", "auto", "approved"],
      skill: ["reading", "listening", "writing", "speaking"],
      srs_item_type: ["word", "phrase", "structure"],
      topic_status: ["locked", "learning", "review", "mastered"],
    },
  },
} as const;
