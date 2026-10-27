import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { SupabaseBrowserAuth } from "./supabase-browser-auth";

function clientWhoseSignOutReturns(
  error: { message: string } | null,
): Pick<SupabaseClient, "auth"> {
  return { auth: { signOut: async () => ({ error }) } } as unknown as Pick<SupabaseClient, "auth">;
}

describe("SupabaseBrowserAuth.signOut", () => {
  it("resolve quando o Supabase não devolve erro", async () => {
    const auth = new SupabaseBrowserAuth(clientWhoseSignOutReturns(null));
    await expect(auth.signOut()).resolves.toBeUndefined();
  });

  it("lança um Error com a mensagem do Supabase quando há erro", async () => {
    const auth = new SupabaseBrowserAuth(clientWhoseSignOutReturns({ message: "network down" }));
    await expect(auth.signOut()).rejects.toThrow(/sair.*network down/);
  });
});
