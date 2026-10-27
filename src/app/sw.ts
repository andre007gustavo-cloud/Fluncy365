/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const isUserDataRequest = ({
  request,
  url,
  sameOrigin,
}: {
  request: Request;
  url: URL;
  sameOrigin: boolean;
}) =>
  request.mode === "navigate" ||
  request.headers.get("RSC") === "1" ||
  request.headers.has("Next-Router-Prefetch") ||
  url.pathname.startsWith("/api/") ||
  url.pathname.startsWith("/auth/") ||
  !sameOrigin;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Dados do usuário não ficam no aparelho (nem após logout): nada disso vai para o Cache Storage.
    { matcher: isUserDataRequest, handler: new NetworkOnly() },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
