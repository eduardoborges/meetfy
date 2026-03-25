import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  platform: 'node',
  target: 'node22',
  clean: true,
  outDir: 'dist',
  treeshake: 'smallest',
  /** Same as esbuild bundle: true; needed for installs that ship only dist/index.cjs (e.g. AUR). */
  noExternal: [/.*/],
  outExtension({ format }) {
    return format === 'cjs' ? { js: '.cjs' } : { js: '.js' };
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
});
