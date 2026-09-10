import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

const apiDir = path.resolve(process.cwd(), 'api');

if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

for (const file of ['index.ts', 'index.cjs']) {
  const target = path.join(apiDir, file);
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }
}

await build({
  entryPoints: ['server/apiEntry.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  outfile: 'api/index.js',
});

console.log('Successfully generated ES module api/index.js for Vercel.');
