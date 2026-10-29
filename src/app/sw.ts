/// <reference lib="webworker" />
import { PAGES_CACHE_NAME, defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Os caches estáticos casam só pela extensão; limitar a caminhos públicos evita guardar arquivos privados de rotas próprias.
const PUBLIC_ASSET_PREFIXES = ["/_next/static/", "/icons/", "/apple-touch-icon.png"];

const isPublicAsset = (url: URL) =>
  PUBLIC_ASSET_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

// Cross-origin fica sem cache por prudência (inclui Supabase e qualquer API externa).
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
  !sameOrigin ||
  !isPublicAsset(url);

const PUBLIC_STATIC_CACHES = new Set([
  "static-font-assets",
  "static-image-assets",
  "next-static-js-assets",
  "static-audio-assets",
  "static-video-assets",
  "static-js-assets",
  "static-style-assets",
]);

// Caches de versões anteriores do SW que podem ter guardado páginas ou dados do usuário.
const LEGACY_CACHE_NAMES = [
  ...Object.values(PAGES_CACHE_NAME),
  "apis",
  "others",
  "cross-origin",
  "next-data",
  "static-data-assets",
  "next-image",
];

const getCacheName = (handler: unknown): string | undefined =>
  typeof handler === "object" &&
  handler !== null &&
  "cacheName" in handler &&
  typeof handler.cacheName === "string"
    ? handler.cacheName
    : undefined;

const publicStaticCache = defaultCache.filter((entry) => {
  const cacheName = getCacheName(entry.handler);
  return cacheName !== undefined && PUBLIC_STATIC_CACHES.has(cacheName);
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Dados do usuário não ficam no aparelho (nem após logout): nada disso vai para o Cache Storage.
    { matcher: isUserDataRequest, handler: new NetworkOnly() },
    // Lista de permitidos: só arquivos estáticos comprovadamente públicos são guardados.
    ...publicStaticCache,
    { matcher: () => true, handler: new NetworkOnly() },
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

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => LEGACY_CACHE_NAMES.includes(name))
            .map((name) => caches.delete(name)),
        ),
      ),
  );
});
