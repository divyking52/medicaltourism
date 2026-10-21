/**
 * Repairs `i18n.js`: restores a truncated tail and removes duplicated
 * dictionary entries (the last definition of a key wins).
 *
 * Usage: node scripts/repair_i18n.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'i18n.js');

const TAIL = ` = { en: EN };\n})(typeof window !== 'undefined' ? window : globalThis);\n`;

let src = fs.readFileSync(FILE, 'utf8');

// 1. restore the tail if it was truncated
if (!/global\.SITE_I18N\s*=\s*\{ en: EN \};/.test(src)) {
  if (src.includes('global.SITE_I18N') && !src.includes('global.SITE_I18N = { en: EN };')) {
    src = src.replace(/global\.SITE_I18N\s*$/, 'global.SITE_I18N');
    src += TAIL;
    console.log('tail restored');
  }
}

// 2. drop duplicated entries (keep the last definition of each key)
const lines = src.split('\n');
const seen = new Map();
const entryRe = /^(\s*)'((?:[^'\\]|\\.)*)':\s*('(?:[^'\\]|\\.)*')(,?)$/;

for (let i = 0; i < lines.length; i++) {
  const m = entryRe.exec(lines[i]);
  if (!m) continue;
  if (seen.has(m[2])) {
    seen.get(m[2]).push(i);
  } else {
    seen.set(m[2], [i]);
  }
}

const toRemove = new Set();
for (const [, idxs] of seen) {
  // keep the last occurrence, remove the earlier ones
  for (let k = 0; k < idxs.length - 1; k++) toRemove.add(idxs[k]);
}

if (toRemove.size) {
  const kept = lines.filter((_, i) => !toRemove.has(i));
  src = kept.join('\n');
  console.log(`removed ${toRemove.size} duplicated entries`);
}

// 3. make sure the last entry of the object has no dangling comma issues
src = src.replace(/\n(\s*);?\s*\n\s*\n\s*global\.SITE_I18N/, '\n  };\n\n  global.SITE_I18N');

fs.writeFileSync(FILE, src, 'utf8');

// 4. validate
new vm.Script(src, { filename: FILE });
const sandbox = {};
vm.runInNewContext(src, sandbox);
const entries = Object.keys(sandbox.SITE_I18N.en);
console.log(`i18n.js OK — ${entries.length} unique entries`);
