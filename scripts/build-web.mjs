#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const webRoot = join(root, 'web');
const require = createRequire(import.meta.url);

function resolveNextBin() {
  try {
    return require.resolve('next/dist/bin/next');
  } catch {
    const localNextBin = join(webRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
    return existsSync(localNextBin) ? localNextBin : null;
  }
}

const nextBin = resolveNextBin();
if (!nextBin) {
  process.stderr.write('Unable to find Next.js. Run `npm install` at the repo root or inside web/ first.\n');
  process.exit(1);
}

const child = spawn(process.execPath, [nextBin, 'build'], {
  cwd: webRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: '1',
  },
});

child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});
