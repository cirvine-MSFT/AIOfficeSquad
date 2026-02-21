#!/usr/bin/env node
const { execFileSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const tsx = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
const entry = path.join(root, 'apps', 'officeagent', 'src', 'index.ts');

try {
  execFileSync(tsx, [entry, ...process.argv.slice(2)], { stdio: 'inherit', cwd: process.cwd() });
} catch (e) {
  process.exit(e.status || 1);
}
