import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { pt } from "@/presentation/i18n/pt";
import "@/presentation/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: pt.app.name,
    template: `%s · ${pt.app.name}`,
  },
  description: pt.app.tagline,
  applicationName: pt.app.name,
  appleWebApp: {
    capable: true,
    title: pt.app.name,
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#111a1f" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Aplica o tema antes da primeira pintura para o app nao "piscar" branco no
 * celular em modo escuro. A escolha manual (Fase 4) so precisara gravar
 * "tema" no localStorage — a leitura ja esta pronta aqui.
 */
const THEME_SCRIPT = `
try {
  var saved = localStorage.getItem("tema");
  var dark = saved ? saved === "escuro"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", dark);
} catch (_) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
