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

  return (
    <Button
      variant="ghost"
      size="sm"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        await signOut();
        router.replace("/entrar");
        router.refresh();
      }}
    >
      {pt.auth.signOut}
    </Button>
  );
}
