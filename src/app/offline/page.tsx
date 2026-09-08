import type { Metadata } from "next";
import { Card, CardDescription, CardTitle } from "@/presentation/components/ui";
import { pt } from "@/presentation/i18n/pt";

export const metadata: Metadata = { title: pt.offline.title };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4">
      <Card>
        <CardTitle>{pt.offline.title}</CardTitle>
        <CardDescription>{pt.offline.body}</CardDescription>
      </Card>
    </main>
  );
}
