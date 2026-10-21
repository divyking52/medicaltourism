/**
 * Moves the "NUESTRAS PLATAFORMAS" banner section above the B2B business
 * section on the homepage.
 *
 * Usage: node scripts/move_platforms_section.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.template.html');

let html = fs.readFileSync(FILE, 'utf8');

// --- extract the platforms section (comment + section element) ---
const startMarker = `      <!-- ============================================================
           PLATFORMS BANNER — Travel Mexico & Hospitality Cancún
           ============================================================ -->`;

const startIdx = html.indexOf(startMarker);
if (startIdx === -1) throw new Error('platforms section start marker not found');

const sectionStart = html.indexOf('<section class="platforms-banner" id="plataformas">', startIdx);
const sectionEnd = html.indexOf('</section>', sectionStart);
if (sectionStart === -1 || sectionEnd === -1) throw new Error('platforms section element not found');

const blockEnd = sectionEnd + '</section>'.length;
// include the trailing blank line after the section
let blockEndFull = blockEnd;
if (html[blockEndFull] === '\r\n') blockEndFull += 2;
else if (html[blockEndFull] === '\n') blockEndFull += 1;

const block = html.slice(startIdx, blockEndFull);
html = html.slice(0, startIdx) + html.slice(blockEndFull);

// --- insert it before the B2B business section ---
const anchor = `      <!-- ============================================================
           SECTION 01 — BUSINESS MATCHMAKING (Market Place B2B)`;
const anchorIdx = html.indexOf(anchor);
if (anchorIdx === -1) throw new Error('business section anchor not found');

html = html.slice(0, anchorIdx) + block + html.slice(anchorIdx);

fs.writeFileSync(FILE, html, 'utf8');

// --- report the new order ---
const order = [...html.matchAll(/<section[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
console.log('Section order:', order.join(' -> '));
