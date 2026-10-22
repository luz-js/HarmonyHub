// Configuracion de ESLint (formato "flat config" de ESLint 9) para todo el monorepo.
// Solo reglas de calidad/bugs; el formato del codigo queda fuera (eso seria Prettier).
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  // Carpetas que no se revisan: compilados, dependencias y cosas generadas.
  {
    ignores: ["**/dist/**", "**/build/**", "**/coverage/**", "**/node_modules/**", "**/generated/**", "var/**", "apps/api/var/**"],
  },

  // Base para todo el codigo TypeScript/JavaScript.
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Hay ~70 "any" en el codigo; tiparlos todos es un trabajo aparte. Por ahora solo avisa.
      "@typescript-eslint/no-explicit-any": "warn",
      // Permite descartar a proposito con "_" o al separar campos con ...rest.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },

  // API (NestJS sobre Node).
  {
    files: ["apps/api/**/*.ts"],
    languageOptions: { globals: globals.node },
  },

  // Scripts de la web que corren con Node (ej. generar los iconos de la app instalable).
  {
    files: ["apps/web/scripts/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },

  // Web (React + Vite en el navegador).
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      // Reglas pensadas para el React Compiler (que este proyecto no usa). Avisan de
      // patrones mejorables, pero corregirlos implica cambiar logica: quedan como aviso.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },

  // Archivos de configuracion en la raiz y en cada app (corren en Node).
  {
    files: ["*.{js,mjs,cjs,ts}", "apps/*/*.{js,mjs,cjs,ts}"],
    languageOptions: { globals: globals.node },
  },
);
