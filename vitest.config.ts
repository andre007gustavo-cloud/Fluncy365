import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@content": fileURLToPath(new URL("./content", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/domain/**/*.ts", "src/application/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/index.ts",
        // Modulos que contem SOMENTE tipos e interfaces: nao geram codigo
        // executavel, entao apareceriam eternamente como 0% e mascarariam
        // a cobertura real da logica.
        "src/domain/ports/**",
        "src/application/generate-daily-session.ts",
        "src/domain/entities/exercise.ts",
        "src/domain/entities/lesson.ts",
        "src/domain/entities/session.ts",
        "src/domain/entities/student.ts",
        "src/domain/entities/tutor.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
