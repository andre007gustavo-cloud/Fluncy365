import type { JwRef, Lesson, UnitSpec } from "@/domain/entities/lesson";
import type { ContentRepositoryPort } from "@/domain/ports/content-repository.port";
import { jwRefFromRow, lessonFromRow, unitFromRow } from "./content-schemas";
import { DEFAULT_COURSE_ID } from "./course";
import type { Supabase } from "./supabase-repositories";

const UNIT_COLUMNS =
  "id, month, week, level, grammar_topics, vocab_list, pt_error_targets, jw_refs, murphy_ref, mastery_criteria";
const LESSON_COLUMNS = "id, unit_id, day_index, blocks, exercises, status, version";
const JW_REF_COLUMNS = "id, url, title, type, level, minutes, topics";

function fail(context: string, error: { message: string }): never {
  throw new Error(`Supabase (${context}): ${error.message}`);
}

export class SupabaseContentRepository implements ContentRepositoryPort {
  constructor(private readonly supabase: Supabase) {}

  async findUnit(unitId: string): Promise<UnitSpec | null> {
    const { data, error } = await this.supabase
      .from("content_units")
      .select(UNIT_COLUMNS)
      .eq("id", unitId)
      .eq("course_id", DEFAULT_COURSE_ID)
      .maybeSingle();

    if (error) fail("findUnit content_units", error);
    return data ? unitFromRow(data) : null;
  }

  async findLesson(unitId: string, dayIndex: number): Promise<Lesson | null> {
    const { data, error } = await this.supabase
      .from("content_lessons")
      .select(LESSON_COLUMNS)
      .eq("unit_id", unitId)
      .eq("day_index", dayIndex)
      .eq("course_id", DEFAULT_COURSE_ID)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) fail("findLesson content_lessons", error);
    return data ? lessonFromRow(data) : null;
  }

  async saveLesson(): Promise<void> {
    throw new Error(
      "Conteudo so e gravado pela service_role (scripts de seed); o app nao pode salvar licoes.",
    );
  }

  async listJwRefs(unitId: string): Promise<readonly JwRef[]> {
    const unit = await this.findUnit(unitId);
    if (!unit || unit.jwRefs.length === 0) return [];

    const { data, error } = await this.supabase
      .from("content_jw_refs")
      .select(JW_REF_COLUMNS)
      .in("id", [...unit.jwRefs])
      .eq("course_id", DEFAULT_COURSE_ID);

    if (error) fail("listJwRefs content_jw_refs", error);
    return (data ?? []).map(jwRefFromRow);
  }
}
