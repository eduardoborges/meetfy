import { defineConfig } from "oxlint";
import base from "./packages/oxlint-config/base.config.ts";

export default defineConfig({
  extends: [base],
  ignorePatterns: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
});
