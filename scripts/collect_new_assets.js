/**
 * Collects every image added to the website since the initial commit into
 * a single "new assets" folder, keeping the original filenames.
 *
 * Usage: node scripts/collect_new_assets.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DEST = path.join(ROOT, 'new assets');
const BASE_COMMIT = '066f849';

const added = execSync(`git diff --name-status ${BASE_COMMIT} HEAD -- assets/`, { cwd: ROOT })
  .toString()
  .split('\n')
  .filter((l) => l.startsWith('A\t'))
  .map((l) => l.split('\t')[1])
  .filter((p) => /\.(png|jpe?g|svg|webp|ico)$/i.test(p));

fs.mkdirSync(DEST, { recursive: true });

let copied = 0;
let total = 0;
for (const rel of added) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) { console.log(`- missing: ${rel}`); continue; }
  const name = path.basename(rel);
  const dest = path.join(DEST, name);
  if (fs.existsSync(dest)) {
    console.log(`! name collision, skipped: ${name} (from ${rel})`);
    continue;
  }
  fs.copyFileSync(src, dest);
  const kb = (fs.statSync(dest).size / 1024).toFixed(0);
  total += fs.statSync(dest).size;
  copied++;
  console.log(`✓ ${name.padEnd(34)} ${kb.padStart(6)} KB   (from ${rel})`);
}

console.log(`\n${copied} image(s) collected into "new assets" — ${(total / 1024 / 1024).toFixed(2)} MB`);
