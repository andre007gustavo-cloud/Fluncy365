import type { MetadataRoute } from "next";
import { pt } from "@/presentation/i18n/pt";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${pt.app.name} — ${pt.app.tagline}`,
    short_name: pt.app.name,
    description: pt.app.tagline,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbfaf7",
    theme_color: "#1f8074",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
