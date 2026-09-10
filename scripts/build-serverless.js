import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

// 1. Ensure api directory exists
const apiDir = path.resolve(process.cwd(), 'api');
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

// 2. Clean up any legacy or obsolete stubs (api/index.ts or api/index.js) if present
for (const file of ['index.ts', 'index.js']) {
  const target = path.join(apiDir, file);
  try {
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
  } catch {
    // Silently continue if already absent
  }
}

// 3. Bundle server/apiEntry.ts into a self-contained CommonJS function
await build({
  entryPoints: ['server/apiEntry.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  outfile: 'api/index.cjs',
  footer: {
    js: 'module.exports = Object.assign(app, { default: app });',
  },
});

console.log('Successfully generated self-contained api/index.cjs for Vercel deployment.');
