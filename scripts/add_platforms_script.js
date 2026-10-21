/**
 * Adds the platforms stage script tag to every page template.
 * Usage: node scripts/add_platforms_script.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATES = [
  'index.template.html',
  'agenda.template.html',
  'expo.template.html',
  'sede.template.html',
  'galeria.template.html',
];

const TAG = `  <script src="platforms-stage.js"></script>`;

for (const file of TEMPLATES) {
  const filePath = path.join(ROOT, file);
  let html = fs.readFileSync(filePath, 'utf8');

  if (html.includes('platforms-stage.js')) {
    console.log(`- ${file}: already wired, skipped`);
    continue;
  }

  const anchor = `  <script src="script.js"></script>`;
  if (!html.includes(anchor)) throw new Error(`[${file}] script.js tag not found`);
  html = html.replace(anchor, TAG + '\n' + anchor);

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`✓ ${file} updated`);
}
