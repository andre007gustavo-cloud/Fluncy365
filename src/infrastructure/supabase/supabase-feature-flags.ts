import { z } from "zod";
import type { FeatureFlag, FeatureFlagPort } from "@/domain/ports/feature-flag.port";
import type { Supabase } from "./supabase-repositories";

const courseRowSchema = z.object({ id: z.string() });

const COURSE_BY_FLAG: Readonly<Record<FeatureFlag, string>> = {
  module_vmw: "vmw",
};

/**
 * A flag vale quando o curso e visivel para quem consulta: a RLS de `courses`
 * esconde cursos owner_only de quem nao e admin, entao o banco decide o acesso.
 */
export class SupabaseFeatureFlags implements FeatureFlagPort {
  constructor(private readonly supabase: Supabase) {}

  async isEnabled(flag: FeatureFlag): Promise<boolean> {
    const courseId = COURSE_BY_FLAG[flag];
    const { data, error } = await this.supabase
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase (isEnabled ${flag}): ${error.message}`);
    }
    if (!data) return false;
    return courseRowSchema.parse(data).id === courseId;
  }
}
