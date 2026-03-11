/* eslint-disable import/no-extraneous-dependencies */
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/index.js',
  banner: { js: '#!/usr/bin/env node\n' },
  packages: 'external',
})
  .then(() => console.log('Build completed'))
  .catch(() => process.exit(1));
