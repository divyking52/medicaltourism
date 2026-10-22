/**
 * Checks that no downloadable documents (.docx/.xlsx/.pdf) remain linked
 * from the built pages.
 *
 * Usage: node scripts/audit_downloads.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = ['index.html', 'expo.html', 'agenda.html', 'facilitadores.html', 'sede.html', 'galeria.html', 'standalone.html', 'website_standalone.html'];
const DOC_RE = /(href|src)=["']([^"']*\.(?:docx?|xlsx?|pdf))["']/gi;

let total = 0;
for (const page of PAGES) {
  const file = path.join(ROOT, page);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const found = [];
  let m;
  DOC_RE.lastIndex = 0;
  while ((m = DOC_RE.exec(html)) !== null) found.push(m[2]);
  const unique = [...new Set(found)];
  total += unique.length;
  console.log(`${page.padEnd(24)} ${unique.length} document link(s)${unique.length ? '  ' + unique.join(', ') : ''}`);
}

console.log(`\n${total === 0 ? 'No downloadable documents remain' : total + ' document link(s) still present'}\n`);
process.exit(total === 0 ? 0 : 1);
