import { describe, expect, it, vi } from "vitest";
import { SupabaseFeatureFlags } from "./supabase-feature-flags";
import type { Supabase } from "./supabase-repositories";

function clientReturning(result: { data: unknown; error: { message: string } | null }) {
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue(result);
  const client = { from: vi.fn().mockReturnValue(query) } as unknown as Supabase;
  return { client, query };
}

describe("SupabaseFeatureFlags", () => {
  it("module_vmw ligado quando o curso vmw esta visivel", async () => {
    const { client, query } = clientReturning({ data: { id: "vmw" }, error: null });

    await expect(new SupabaseFeatureFlags(client).isEnabled("module_vmw")).resolves.toBe(true);

    expect(client.from).toHaveBeenCalledWith("courses");
    expect(query.eq).toHaveBeenCalledWith("id", "vmw");
  });

  it("module_vmw desligado quando a RLS esconde o curso", async () => {
    const { client } = clientReturning({ data: null, error: null });

    await expect(new SupabaseFeatureFlags(client).isEnabled("module_vmw")).resolves.toBe(false);
  });

  it("erro do banco lanca excecao em vez de devolver false", async () => {
    const { client } = clientReturning({ data: null, error: { message: "falhou" } });

    await expect(new SupabaseFeatureFlags(client).isEnabled("module_vmw")).rejects.toThrow(
      /isEnabled module_vmw.*falhou/,
    );
  });

  it("resposta fora do formato esperado lanca erro", async () => {
    const { client } = clientReturning({ data: { id: 1 }, error: null });

    await expect(new SupabaseFeatureFlags(client).isEnabled("module_vmw")).rejects.toThrow();
  });
});
