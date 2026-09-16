import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

// 1. Ensure api directory exists
const apiDir = path.resolve(process.cwd(), 'api');
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

// 2. Ensure api directory has type: commonjs so Node/Vercel handles api/index.js as CommonJS
const apiPkgPath = path.join(apiDir, 'package.json');
if (!fs.existsSync(apiPkgPath)) {
  fs.writeFileSync(apiPkgPath, JSON.stringify({ type: 'commonjs' }, null, 2));
}

// 3. Clean up any obsolete TypeScript source or stale .cjs file
for (const file of ['index.ts', 'index.cjs']) {
  const target = path.join(apiDir, file);
  try {
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
  } catch {
    // Silently continue if already absent
  }
}

// 4. Bundle server/apiEntry.ts into a self-contained CommonJS function in api/index.js
await build({
  entryPoints: ['server/apiEntry.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  outfile: 'api/index.js',
  footer: {
    js: 'module.exports = Object.assign(app, { default: app });',
  },
});

console.log('Successfully generated self-contained api/index.js for Vercel deployment.');
