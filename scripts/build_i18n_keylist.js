/**
 * Builds the deduplicated translation key list for the i18n dictionary.
 * Usage: node scripts/build_i18n_keylist.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES = [
  'index.template.html', 'agenda.template.html', 'expo.template.html',
  'sede.template.html', 'galeria.template.html', 'facilitadores.template.html',
];

const all = new Map(); // string -> [files]

for (const file of FILES) {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) continue;
  let html = fs.readFileSync(filePath, 'utf8');

  html = html.replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ');

  const found = new Set();
  for (const p of html.split(/<[^>]+>/)) {
    const t = p.replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
    if (t.length >= 3 && /[a-zA-ZÁÉÍÓÚÑáéíóúñ]/.test(t) && !/^(https?:|mailto:|tel:|#|\.|\/|@|\d+$)/.test(t)) found.add(t);
  }
  const attrRe = /(?:aria-label|placeholder|title)="([^"]{2,})"/gi;
  let m;
  while ((m = attrRe.exec(html)) !== null) {
    const t = m[1].replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
    if (t.length >= 3 && /[a-zA-ZÁÉÍÓÚÑáéíóúñ]/.test(t) && !/^(https?:|mailto:|tel:|#)/.test(t)) found.add(t);
  }

  for (const s of found) {
    if (!all.has(s)) all.set(s, []);
    all.get(s).push(file.replace('.template.html', ''));
  }
}

const entries = [...all.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'));
const out = entries.map(([s, files]) => `${JSON.stringify(s)}\t${[...new Set(files)].join(',')}`).join('\n');
const outPath = path.join(__dirname, 'i18n_keys.txt');
fs.writeFileSync(outPath, out, 'utf8');
console.log(`${entries.length} unique strings -> ${path.relative(ROOT, outPath)}`);
const byFile = {};
for (const [, files] of entries) for (const f of new Set(files)) byFile[f] = (byFile[f] || 0) + 1;
console.log(byFile);
