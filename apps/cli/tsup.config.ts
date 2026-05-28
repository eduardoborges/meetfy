import { defineConfig } from 'tsup';
import type { Plugin } from 'esbuild';

/**
 * Stub optional Ink dev-only peer deps so the bundle is self-contained.
 * Ink imports these lazily (only when DEV=true), but esbuild still tries
 * to resolve them at bundle time.
 */
const stubInkOptionalDeps: Plugin = {
  name: 'stub-ink-optional-deps',
  setup(build) {
    const STUBS = new Set(['react-devtools-core']);
    build.onResolve({ filter: /^react-devtools-core$/ }, (args) => {
      if (!STUBS.has(args.path)) return null;
      return { path: args.path, namespace: 'ink-stub' };
    });
    build.onLoad({ filter: /.*/, namespace: 'ink-stub' }, () => ({
      contents: 'module.exports = { connectToDevTools: () => {} };',
      loader: 'js',
    }));
  },
};

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  clean: true,
  outDir: 'dist',
  splitting: false,
  treeshake: 'smallest',
  /** Same as esbuild bundle: true; needed for installs that ship only dist/index.js (e.g. AUR). */
  noExternal: [/.*/],
  esbuildPlugins: [stubInkOptionalDeps],
  banner: {
    js: `#!/usr/bin/env node
import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);`,
  },
});
