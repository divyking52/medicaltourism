/**
 * Adds the language toggle button to the header (and the mobile drawer)
 * of every page template, plus the i18n script tags.
 *
 * Usage: node scripts/add_lang_toggle.js
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

// The button lives in .nav-actions, just before the register pill
const NAV_TOGGLE = `          <button class="lang-toggle" type="button" data-lang-toggle aria-pressed="false" aria-label="Switch to English / Cambiar a inglés" title="English">
            <span class="lang-toggle-opt" data-lang="es">ES</span>
            <span class="lang-toggle-sep" aria-hidden="true"></span>
            <span class="lang-toggle-opt" data-lang="en">EN</span>
          </button>
`;

// ...and in the mobile drawer footer
const DRAWER_TOGGLE = `          <button class="lang-toggle lang-toggle--block" type="button" data-lang-toggle aria-pressed="false" aria-label="Switch to English / Cambiar a inglés">
            <span class="lang-toggle-opt" data-lang="es">ES</span>
            <span class="lang-toggle-sep" aria-hidden="true"></span>
            <span class="lang-toggle-opt" data-lang="en">EN</span>
          </button>
`;

const I18N_SCRIPTS = `  <!-- Site i18n -->
  <script src="i18n.js"></script>
  <script src="i18n-engine.js"></script>
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

  if (html.includes('data-lang-toggle')) {
    console.log(`- ${file} already has the language toggle, skipping`);
    continue;
  }

  // 1. header toggle — before the register pill
  const navAnchor = `          <button class="pill enter-pill lbl btn-register-trigger"`;
  if (!html.includes(navAnchor)) throw new Error(`[${file}] register pill not found`);
  html = replaceOnce(html, navAnchor, NAV_TOGGLE + navAnchor, 'nav toggle', file);

  // 2. drawer toggle — before the drawer register button
  const drawerAnchor = `          <button class="button primary btn-register-trigger w-full"`;
  if (html.includes(drawerAnchor)) {
    html = replaceOnce(html, drawerAnchor, DRAWER_TOGGLE + drawerAnchor, 'drawer toggle', file);
  } else {
    const drawerAlt = `          <button class="button primary btn-register-trigger w-full" type="button"`;
    if (html.includes(drawerAlt)) {
      html = replaceOnce(html, drawerAlt, DRAWER_TOGGLE + drawerAlt, 'drawer toggle', file);
    }
  }

  // 3. i18n scripts — right before the main script
  const scriptAnchor = `  <script src="script.js"></script>`;
  if (!html.includes(scriptAnchor)) throw new Error(`[${file}] script.js tag not found`);
  html = replaceOnce(html, scriptAnchor, I18N_SCRIPTS + scriptAnchor, 'i18n scripts', file);

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`✓ ${file} updated`);
}

console.log('\nLanguage toggle added to all templates.');
