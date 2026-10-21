/**
 * Adds the "Nuestras plataformas" strip (Travel Mexico + Hospitality Cancún)
 * to the footer of every page template, so the platforms are promoted
 * site-wide and not only on the homepage banner.
 *
 * Usage: node scripts/add_platforms_strip.js
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

const STRIP = `      <!-- ============================================================
           NUESTRAS PLATAFORMAS — Travel Mexico & Hospitality Cancún
           ============================================================ -->
      <div class="footer-platforms">
        <div class="container footer-platforms-inner">
          <span class="footer-platforms-label">NUESTRAS PLATAFORMAS</span>
          <div class="footer-platforms-actions">
            <a class="footer-platform-btn" href="https://travelmexico.travel" target="_blank" rel="noopener noreferrer">
              <span class="footer-platform-btn-label">TRAVEL MEXICO</span>
              <span class="footer-platform-btn-arrow" aria-hidden="true">→</span>
            </a>
            <a class="footer-platform-btn" href="https://hospitalitycancun.com" target="_blank" rel="noopener noreferrer">
              <span class="footer-platform-btn-label">HOSPITALIDAD CANCÚN</span>
              <span class="footer-platform-btn-arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>

`;

function replaceOnce(html, find, replacement, label, file) {
  const parts = html.split(find);
  if (parts.length !== 2) {
    throw new Error(`[${file}] ${label}: expected exactly 1 match, found ${parts.length - 1}`);
  }
  return parts.join(replacement);
}

for (const file of TEMPLATES) {
  const filePath = path.join(ROOT, file);
  let html = fs.readFileSync(filePath, 'utf8');

  if (html.includes('class="footer-platforms"')) {
    console.log(`- ${file} already has the platforms strip, skipping`);
    continue;
  }

  const anchor = `      <!-- Bottom Sub-Footer Bar -->`;
  if (!html.includes(anchor)) {
    throw new Error(`[${file}] bottom sub-footer anchor not found`);
  }
  html = replaceOnce(html, anchor, STRIP + anchor, 'platforms strip', file);

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`✓ ${file} updated`);
}

console.log('\nPlatforms strip added to all footers.');
