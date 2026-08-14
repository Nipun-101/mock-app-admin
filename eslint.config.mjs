import nextPlugin from "@next/eslint-plugin-next";
import nextParser from "eslint-config-next/parser";
import reactHooks from "eslint-plugin-react-hooks";

const plugin = nextPlugin.default ?? nextPlugin;

const eslintConfig = [
  {
    ignores: [".next/**", "out/**", "node_modules/**"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs}"],
    languageOptions: {
      parser: nextParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ["next/babel"],
        },
      },
    },
    plugins: {
      "@next/next": plugin,
      "react-hooks": reactHooks,
    },
    rules: {
      ...plugin.configs.recommended.rules,
      ...plugin.configs["core-web-vitals"].rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;
