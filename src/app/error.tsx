"use client";

import { Button, Card, CardDescription, CardTitle } from "@/presentation/components/ui";
import { pt } from "@/presentation/i18n/pt";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4">
      <Card>
        <CardTitle>{pt.errors.unexpectedTitle}</CardTitle>
        <CardDescription>{pt.errors.unexpectedBody}</CardDescription>
        <Button className="mt-4" onClick={reset}>
          {pt.offline.retry}
        </Button>
      </Card>
    </main>
  );
}
