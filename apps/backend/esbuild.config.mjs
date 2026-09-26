import * as esbuild from 'esbuild';
import { copyFileSync, existsSync } from 'node:fs';

const isProduction = process.env.NODE_ENV === 'production';

async function build() {
  try {
    await esbuild.build({
      entryPoints: ['src/server.ts'],
      bundle: true,
      packages: 'external',
      platform: 'node',
      target: 'node22',
      format: 'esm',
      outdir: 'dist',
      sourcemap: !isProduction,
      minify: isProduction,
      treeShaking: true,
      logLevel: 'info',
    });

    if (existsSync('package.json')) {
      copyFileSync('package.json', 'dist/package.json');
    }

    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
