import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["eslint", "typescript", "import", "unicorn", "node", "promise"],
  categories: {
    correctness: "error",
    suspicious: "warn",
  },
  rules: {
    "no-console": "off",
  },
});
