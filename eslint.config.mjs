import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    name: "eslint",
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {},
    files: ["src/**/*.ts"],
  },
  eslintPluginPrettierRecommended,
  {
    ignores: ["dist/", "node_modules/"],
  },
);
