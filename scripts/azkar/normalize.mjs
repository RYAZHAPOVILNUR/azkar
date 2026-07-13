#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const steps = [
  ['import-current.mjs'],
  ['import-hisnul-muslim.mjs'],
  ['validate.mjs'],
  ['detect-duplicates.mjs'],
  ['report.mjs'],
  ['export-miniapp.mjs'],
];

for (const [script] of steps) {
  const res = spawnSync(process.execPath, [path.join(root, 'scripts/azkar', script)], {
    cwd: root,
    stdio: 'inherit',
  });
  if (res.status !== 0) process.exit(res.status || 1);
}
