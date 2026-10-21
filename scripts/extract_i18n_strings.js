/**
 * Extracts the distinct visible text strings from a template so they can be
 * translated and keyed for the i18n layer.
 *
 * Usage: node scripts/extract_i18n_strings.js [file...]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['index.template.html', 'agenda.template.html', 'expo.template.html', 'sede.template.html', 'galeria.template.html', 'facilitadores.template.html'];

const SKIP_TAGS = new Set(['script', 'style', 'svg', 'path', 'rect', 'circle', 'br', 'img', 'source', 'link', 'meta']);

for (const file of files) {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) { console.log(`-- ${file}: missing`); continue; }
  let html = fs.readFileSync(filePath, 'utf8');

  // drop comments, scripts, styles and svg
  html = html.replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ');

  const found = new Set();
  const attrRe = /(?:aria-label|placeholder|title|value)="([^"]{2,})"/gi;

  // text nodes
  const parts = html.split(/<[^>]+>/);
  for (const p of parts) {
    const t = p.replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
    if (t.length >= 3 && /[a-zA-ZÁÉÍÓÚÑáéíóúñ]/.test(t)) found.add(t);
  }
  // attributes
  let m;
  while ((m = attrRe.exec(html)) !== null) {
    const t = m[1].replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
    if (t.length >= 3 && /[a-zA-ZÁÉÍÓÚÑáéíóúñ]/.test(t)) found.add(t);
  }

  const list = [...found].filter((s) => !/^(https?:|mailto:|tel:|#|\.|\/|@)/.test(s));
  console.log(`\n=== ${file}  (${list.length} distinct strings) ===`);
  list.forEach((s) => console.log(s));
}
