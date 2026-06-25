/**
 * @youeye/canvas postbuild script
 *
 * Run after `next build` to prepare the standalone output for deployment.
 * Copies static assets and public files, resolves pnpm symlinks.
 *
 * Usage in package.json:
 *   "scripts": { "build": "next build && node node_modules/@youeye/canvas/src/build/postbuild.mjs" }
 *
 * Or copy this file into your project and reference directly:
 *   "scripts": { "build": "next build && node scripts/postbuild.mjs" }
 */

import { cpSync, existsSync, mkdirSync, readdirSync, lstatSync, readlinkSync, rmSync } from 'fs';
import { join, resolve, dirname } from 'path';

const standaloneDir = join(process.cwd(), '.next', 'standalone');

if (!existsSync(standaloneDir)) {
  console.error('Standalone directory not found. Run next build first.');
  process.exit(1);
}

// Copy .next/static to standalone
const staticSrc = join(process.cwd(), '.next', 'static');
const staticDest = join(standaloneDir, '.next', 'static');
if (existsSync(staticSrc)) {
  console.log('Copying .next/static to standalone...');
  cpSync(staticSrc, staticDest, { recursive: true });
}

// Copy public/ to standalone
const publicSrc = join(process.cwd(), 'public');
const publicDest = join(standaloneDir, 'public');
if (existsSync(publicSrc)) {
  console.log('Copying public/ to standalone...');
  cpSync(publicSrc, publicDest, { recursive: true });
}

// Fix pnpm modules — copy real packages over symlinks
const pnpmModules = join(standaloneDir, 'node_modules', '.pnpm', 'node_modules');
if (existsSync(pnpmModules)) {
  console.log('Fixing pnpm modules...');
  for (const entry of readdirSync(pnpmModules)) {
    const entryPath = join(pnpmModules, entry);
    if (lstatSync(entryPath).isSymbolicLink()) {
      const target = resolve(dirname(entryPath), readlinkSync(entryPath));
      if (existsSync(target)) {
        rmSync(entryPath, { recursive: true, force: true });
        cpSync(target, entryPath, { recursive: true });
      }
    }
  }
}

// Resolve symlinks in top-level node_modules
const topModules = join(standaloneDir, 'node_modules');
if (existsSync(topModules)) {
  console.log('Resolving symlinks in node_modules...');
  for (const entry of readdirSync(topModules)) {
    if (entry === '.pnpm' || entry.startsWith('.')) continue;
    const entryPath = join(topModules, entry);
    if (lstatSync(entryPath).isSymbolicLink()) {
      const target = resolve(dirname(entryPath), readlinkSync(entryPath));
      if (existsSync(target)) {
        rmSync(entryPath, { recursive: true, force: true });
        cpSync(target, entryPath, { recursive: true });
      }
    }
  }
}

// Ensure Next.js runtime peer dependencies are present in standalone.
// Next.js standalone output doesn't include these but requires them at runtime.
// They live in the project's node_modules (often hoisted by pnpm).
const requiredPeers = ['styled-jsx', '@swc/helpers', '@next/env', 'client-only'];
const projectModules = join(process.cwd(), 'node_modules');

for (const pkg of requiredPeers) {
  const dest = join(topModules, pkg);
  if (existsSync(dest)) continue;

  // Search locations: top-level node_modules, then pnpm virtual store
  const candidates = [
    join(projectModules, pkg),
    join(projectModules, '.pnpm', 'node_modules', pkg),
  ];

  let found = false;
  for (const src of candidates) {
    if (!existsSync(src)) continue;
    // Resolve symlinks (pnpm uses them extensively)
    const realSrc = lstatSync(src).isSymbolicLink()
      ? resolve(dirname(src), readlinkSync(src))
      : src;
    if (!existsSync(realSrc)) continue;

    mkdirSync(dirname(dest), { recursive: true });
    cpSync(realSrc, dest, { recursive: true });
    console.log(`Copied missing peer: ${pkg}`);
    found = true;
    break;
  }

  if (!found) {
    console.warn(`WARNING: Required peer ${pkg} not found in project node_modules`);
  }
}

console.log('Postbuild complete!');
