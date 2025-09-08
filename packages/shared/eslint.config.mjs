// @ts-check
import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["eslint.config.mjs", "dist/"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: 5,
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Separate config for test files
  {
    files: [
      "src/utils/__tests__/messageContent.utils.test.ts",
      "src/utils/__tests__/security.utils.test.ts",
      "src/decorators/__tests__/rbac-authorization.decorators.test.ts",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: 5,
      sourceType: "module",
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "src/utils/__tests__/messageContent.utils.test.ts",
            "src/utils/__tests__/security.utils.test.ts",
            "src/decorators/__tests__/rbac-authorization.decorators.test.ts",
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "no-unused-vars": "error",
      "no-useless-escape": "error",
      "no-control-regex": "error",
    },
  },
);
