/**
 * Removes the CSS rules that belonged to the deleted "allies logos grid"
 * block (`.contacto-allies-block`, `.allies-mini-tag`, `.allies-logos-grid`
 * and `.ally-item`) plus the `.ally-item` entries in the shared
 * smoke-hover selector lists.
 *
 * Usage: node scripts/remove_allies_css.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'styles.css');

let css = fs.readFileSync(FILE, 'utf8');
const before = css.length;

// 1. drop the dedicated blocks
const blocks = [
  /\.allies-logos-grid \{[\s\S]*?\n\}\n\n/,
  /\.ally-item \{[\s\S]*?\n\}\n\n/,
  /\.ally-item:hover \{[\s\S]*?\n\}\n\n/,
  /\.ally-item img \{[\s\S]*?\n\}\n\n/,
  /\.contacto-allies-block \{[\s\S]*?\n\}\n\n/,
  /\.allies-mini-tag \{[\s\S]*?\n\}\n\n/,
];

for (const re of blocks) {
  const m = css.match(re);
  if (m) {
    css = css.replace(re, '');
    console.log(`removed ${m[0].split('{')[0].trim()}`);
  } else {
    console.log(`not found: ${re.source.slice(0, 40)}`);
  }
}

// 2. drop `.ally-item` from the shared selector lists
css = css.replace(/\n\.ally-item,/g, '');
css = css.replace(/\n\.ally-item::after,/g, '');
css = css.replace(/\n\.ally-item:hover::after,/g, '');
css = css.replace(/\n\.ally-item > \*,/g, '');

fs.writeFileSync(FILE, css, 'utf8');

const left = (css.match(/ally-item|allies-logos-grid|allies-mini-tag|contacto-allies-block/g) || []).length;
console.log(`styles.css: ${before - css.length} bytes removed, ${left} remaining references`);
