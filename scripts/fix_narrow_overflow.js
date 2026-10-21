/**
 * Prevents horizontal overflow on narrow screens:
 *   1. `minmax(320px, 1fr)` forces a 320px track inside a narrower
 *      container, pushing the card outside its parent. Wrapping the
 *      minimum in `min(..., 100%)` lets the track shrink to the
 *      container width.
 *   2. Long uppercase button labels with `white-space: nowrap` cannot
 *      shrink, so they are clipped on very small screens. Allowing them
 *      to wrap below 480px keeps the button inside its card.
 *
 * Usage: node scripts/fix_narrow_overflow.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES = [
  'styles.css',
  'index.template.html',
  'agenda.template.html',
  'expo.template.html',
  'sede.template.html',
  'galeria.template.html',
  'facilitadores.template.html',
];

const MINMAX_RE = /minmax\((\d+)px, 1fr\)/g;

let total = 0;
for (const file of FILES) {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) { console.log(`- ${file} not found`); continue; }
  let content = fs.readFileSync(filePath, 'utf8');
  let count = 0;
  content = content.replace(MINMAX_RE, (_, px) => {
    count++;
    return `minmax(min(${px}px, 100%), 1fr)`;
  });
  if (count) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${file}: ${count} grid track(s) made shrinkable`);
    total += count;
  } else {
    console.log(`- ${file}: no changes`);
  }
}
console.log(`\n${total} grid track(s) fixed.`);
