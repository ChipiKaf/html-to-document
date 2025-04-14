// Migrated from .eslintrc.json for ESLint v9+
module.exports = [
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": require("@typescript-eslint/eslint-plugin"),
      prettier: require("eslint-plugin-prettier"),
    },
    rules: {
      ...require("eslint-plugin-prettier/recommended").rules,
      ...require("@typescript-eslint/eslint-plugin").configs.recommended.rules,
      "prettier/prettier": "error",
      semi: ["error", "always"],
      quotes: ["error", "single"],
    },
  },
];
