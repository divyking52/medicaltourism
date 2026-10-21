/**
 * Swaps the platforms CSS block inside `styles.css` for the cinematic
 * version kept in `assets/platforms-stage.css`.
 *
 * Usage: node scripts/swap_platforms_css.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CSS = path.join(ROOT, 'styles.css');
const NEW = path.join(ROOT, 'assets', 'platforms-stage.css');

const START = `/* ============================================================
   PLATFORMS BANNER — Travel Mexico & Hospitality Cancún
   ============================================================ */`;

const END = `/* ============================================================
   FOOTER PLATFORMS STRIP (all pages)
   ============================================================ */`;

let css = fs.readFileSync(CSS, 'utf8');
const newBlock = fs.readFileSync(NEW, 'utf8').trimEnd();

const startIdx = css.indexOf(START);
if (startIdx === -1) throw new Error('platforms CSS start marker not found');
const endIdx = css.indexOf(END, startIdx);
if (endIdx === -1) throw new Error('footer platforms CSS end marker not found');

css = css.slice(0, startIdx) + newBlock + '\n\n' + css.slice(endIdx);
fs.writeFileSync(CSS, css, 'utf8');
console.log('styles.css: platforms block replaced');
