/**
 * Adds the floating WhatsApp contact button to every page template.
 *
 * The button is placed next to the floating back-to-top control (outside
 * <main>), so it stays visible across every section and every SPA view of
 * the unified single-file build.
 *
 * Usage: node scripts/add_whatsapp_button.js
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

const PHONE_DISPLAY = '+52 1 55 3083 3864';
const PHONE_DIGITS = '525530833864';
const WA_TEXT = encodeURIComponent(
  'Hola, quisiera información sobre el 15° Congreso de Turismo Médico 2026.'
);

const BUTTON = `
    <!-- ============================================================
         FLOATING WHATSAPP CONTACT BUTTON
         Always visible while navigating the site
         ============================================================ -->
    <a class="whatsapp-float" href="https://wa.me/${PHONE_DIGITS}?text=${WA_TEXT}" target="_blank" rel="noopener noreferrer" aria-label="Escríbenos por WhatsApp al ${PHONE_DISPLAY}">
      <span class="whatsapp-float-ring" aria-hidden="true"></span>
      <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.04 3C8.85 3 3 8.85 3 16.04c0 2.27.6 4.5 1.73 6.44L3 29l6.7-1.75a12.98 12.98 0 0 0 6.34 1.63h.01c7.19 0 13.04-5.85 13.04-13.04S23.23 3 16.04 3zm0 23.84h-.01a10.8 10.8 0 0 1-5.5-1.51l-.4-.24-3.98 1.04 1.06-3.88-.26-.42a10.78 10.78 0 0 1-1.65-5.75C5.3 9.87 10.16 5 16.03 5s10.73 4.87 10.73 10.84S23.22 26.84 16.04 26.84zm5.94-8.13c-.32-.16-1.92-.95-2.22-1.06-.3-.11-.51-.16-.72.16-.21.32-.83 1.05-1.02 1.27-.19.21-.37.24-.69.08-.32-.16-1.37-.5-2.61-1.61-.96-.86-1.61-1.92-1.8-2.24-.19-.32-.02-.5.14-.66.15-.15.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.75-.79-2.39-.21-.63-.42-.55-.57-.56h-.49c-.17 0-.44.06-.66.31-.22.24-.85.84-.85 2.05s.88 2.38 1 2.54c.13.16 1.73 2.63 4.18 3.69.59.25 1.04.4 1.4.51.59.19 1.12.16 1.55.1.47-.07 1.46-.6 1.66-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.55-.33z"/></svg>
      <span class="whatsapp-float-label">${PHONE_DISPLAY}</span>
    </a>
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

  if (html.includes('class="whatsapp-float"')) {
    console.log(`- ${file} already has the WhatsApp button, skipping`);
    continue;
  }

  // Insert right after the floating back-to-top button block
  const anchor = `    <!-- Floating Mobile Back To Top Button -->`;
  if (!html.includes(anchor)) {
    throw new Error(`[${file}] back-to-top anchor comment not found`);
  }
  html = replaceOnce(html, anchor, `${BUTTON}\n${anchor}`, 'whatsapp button', file);

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`✓ ${file} updated`);
}

console.log('\nWhatsApp button added to all templates.');
