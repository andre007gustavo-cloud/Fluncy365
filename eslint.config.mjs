import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "next-env.d.ts",
      "public/sw.js",
      "public/swe-worker-*.js",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message:
            "Use ClockPort.now() em vez de new Date() — o domínio precisa ser testável com relógio simulado.",
        },
      ],
    },
  },
  {
    // A camada de dominio nao pode importar nada de fora dela mesma.
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react-dom",
                "next",
                "next/*",
                "@supabase/*",
                "dexie",
                "zustand",
                "framer-motion",
                "@/infrastructure/*",
                "@/presentation/*",
                "@/application/*",
              ],
              message:
                "A camada domain nao pode depender de framework, banco ou UI (regra de dependencia da Clean Architecture).",
            },
          ],
        },
      ],
    },
  },
  {
    // A camada de aplicacao so pode depender do dominio.
    files: ["src/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "next",
                "next/*",
                "@supabase/*",
                "dexie",
                "@/infrastructure/*",
                "@/presentation/*",
              ],
              message: "A camada application so pode importar de @/domain.",
            },
          ],
        },
      ],
    },
  },
  {
    // A camada de apresentacao nunca fala com banco ou IA diretamente.
    files: ["src/presentation/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@supabase/*", "dexie", "@anthropic-ai/*"],
              message: "A UI nao acessa banco/IA diretamente. Use um caso de uso via @/di.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/infrastructure/**/*.ts", "src/app/sw.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    // Testes podem montar fakes dos ports; e exatamente para isso que eles existem.
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: { "no-restricted-syntax": "off", "no-restricted-imports": "off" },
  },
];

export default config;
