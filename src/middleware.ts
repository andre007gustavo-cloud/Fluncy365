import type { NextRequest } from "next/server";
import { updateSession } from "@/infrastructure/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Roda em tudo, menos arquivos estaticos, imagens e o service worker.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|swe-worker-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
