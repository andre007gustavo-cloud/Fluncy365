import type { Config } from "tailwindcss";

/**
 * Tokens de design (secao 9 da Fase 0). As cores vivem como canais HSL em
 * globals.css para que o modo escuro seja apenas uma troca de variaveis e para
 * que utilitarios com alfa (bg-brand/10) continuem funcionando.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--color-background) / <alpha-value>)",
        surface: "hsl(var(--color-surface) / <alpha-value>)",
        "surface-raised": "hsl(var(--color-surface-raised) / <alpha-value>)",
        foreground: "hsl(var(--color-foreground) / <alpha-value>)",
        muted: "hsl(var(--color-muted) / <alpha-value>)",
        border: "hsl(var(--color-border) / <alpha-value>)",
        brand: {
          DEFAULT: "hsl(var(--color-brand) / <alpha-value>)",
          strong: "hsl(var(--color-brand-strong) / <alpha-value>)",
          soft: "hsl(var(--color-brand-soft) / <alpha-value>)",
          contrast: "hsl(var(--color-brand-contrast) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--color-accent) / <alpha-value>)",
          soft: "hsl(var(--color-accent-soft) / <alpha-value>)",
          contrast: "hsl(var(--color-accent-contrast) / <alpha-value>)",
        },
        success: "hsl(var(--color-success) / <alpha-value>)",
        danger: "hsl(var(--color-danger) / <alpha-value>)",
        warning: "hsl(var(--color-warning) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Escala tipografica 1.200 (minor third), base 16px.
        xs: ["0.694rem", { lineHeight: "1.5" }],
        sm: ["0.833rem", { lineHeight: "1.5" }],
        base: ["1rem", { lineHeight: "1.6" }],
        lg: ["1.2rem", { lineHeight: "1.5" }],
        xl: ["1.44rem", { lineHeight: "1.4" }],
        "2xl": ["1.728rem", { lineHeight: "1.3" }],
        "3xl": ["2.074rem", { lineHeight: "1.2" }],
        "4xl": ["2.488rem", { lineHeight: "1.15" }],
      },
      borderRadius: {
        sm: "0.375rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
      },
      boxShadow: {
        card: "0 1px 2px hsl(var(--color-shadow) / 0.06), 0 8px 24px hsl(var(--color-shadow) / 0.08)",
        lift: "0 2px 4px hsl(var(--color-shadow) / 0.08), 0 12px 32px hsl(var(--color-shadow) / 0.12)",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 240ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
