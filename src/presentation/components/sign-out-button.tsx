"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/presentation/components/ui";
import { useAuth } from "@/presentation/hooks/use-auth";
import { pt } from "@/presentation/i18n/pt";

export function SignOutButton() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    setFailed(false);
    try {
      await signOut();
    } catch {
      setLoading(false);
      setFailed(true);
      return;
    }
    router.replace("/entrar");
    router.refresh();
  }

  return (
    <>
      <Button variant="ghost" size="sm" loading={loading} onClick={handleSignOut}>
        {pt.auth.signOut}
      </Button>
      {failed && (
        <p role="alert" className="text-sm text-danger">
          {pt.auth.signOutError}
        </p>
      )}
    </>
  );
}
