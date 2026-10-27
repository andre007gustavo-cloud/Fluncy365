import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthOutcome, AuthPort, AuthenticatedUser } from "@/domain/ports/auth.port";
import { createSupabaseBrowserClient } from "./client";
import { siteUrl } from "./env";

/** Traduz os erros do Supabase para mensagens em portugues que o aluno entende. */
function toMessage(raw: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "E-mail ou senha incorretos.",
    "Email not confirmed": "Confirme seu e-mail pelo link que enviamos antes de entrar.",
    "User already registered": "Esse e-mail já tem conta. Tente entrar.",
  };
  return map[raw] ?? raw;
}

export class SupabaseBrowserAuth implements AuthPort {
  constructor(
    private readonly supabase: Pick<SupabaseClient, "auth"> = createSupabaseBrowserClient(),
  ) {}

  async signInWithPassword(email: string, password: string): Promise<AuthOutcome> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    return error ? { ok: false, message: toMessage(error.message) } : { ok: true };
  }

  async signUpWithPassword(email: string, password: string): Promise<AuthOutcome> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
    });

    if (error) return { ok: false, message: toMessage(error.message) };
    return { ok: true, needsEmailConfirmation: data.session === null };
  }

  async signInWithGoogle(redirectPath: string): Promise<AuthOutcome> {
    const next = encodeURIComponent(redirectPath);
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${siteUrl()}/auth/callback?proximo=${next}` },
    });
    return error ? { ok: false, message: toMessage(error.message) } : { ok: true };
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw new Error(`Não foi possível sair: ${toMessage(error.message)}`);
  }

  async currentUser(): Promise<AuthenticatedUser | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) return null;

    const metadata = user.user_metadata as { full_name?: string; name?: string };
    return {
      id: user.id,
      email: user.email ?? null,
      displayName: metadata.full_name ?? metadata.name ?? user.email?.split("@")[0] ?? "",
    };
  }
}
