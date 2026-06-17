import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
 
export default defineConfig([
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "test/**",
      "webapp/resources/**",
      "webapp/test/**",
      "**/*.min.js",
      "index.html",
      "Component-preload.js"
    ]
  },
 
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser,
        sap: "readonly",
        ui5: "readonly",
        $: "readonly",
        jQuery: "readonly",
        XLSX: "readonly",
        html2canvas: "readonly",
        Chart: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" }],
      "no-console": "error"
    }
  },
 
  {
    files: ["**/*.js"],
    languageOptions: { sourceType: "script" }
  }
]);
