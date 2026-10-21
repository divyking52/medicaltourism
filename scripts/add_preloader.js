/**
 * Adds the preloader (loading screen) to every page template.
 *
 * The overlay is the first element in <body> so it paints before anything
 * else, and a tiny inline script in <head> locks scrolling until the
 * critical assets are ready.
 *
 * Usage: node scripts/add_preloader.js
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

const LOADER_HTML = `
    <!-- ============================================================
         PRELOADER — holds the page while critical assets are warmed up
         ============================================================ -->
    <div class="page-loader" id="pageLoader" role="status" aria-live="polite">
      <div class="page-loader-inner">
        <img class="page-loader-logo" src="assets/brand_logo_600.png" alt="15° Congreso de Turismo Médico" width="280" height="42" />
        <div class="page-loader-bar"><span class="page-loader-fill" id="loaderProgress"></span></div>
        <p class="page-loader-status"><span class="page-loader-pct" id="loaderPct">0</span>% · Preparando la experiencia</p>
      </div>
    </div>
`;

// Inline head script: lock the scroll before the page renders
const HEAD_SCRIPT = `  <script>document.documentElement.classList.add('is-preloading');</script>
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

  if (html.includes('id="pageLoader"')) {
    console.log(`- ${file} already has the preloader, skipping`);
    continue;
  }

  // 1. lock scrolling from the <head>
  const headAnchor = `  <link rel="stylesheet" href="styles.css" />`;
  if (!html.includes(headAnchor)) throw new Error(`[${file}] stylesheet link not found`);
  html = replaceOnce(html, headAnchor, `${headAnchor}\n${HEAD_SCRIPT}`, 'head script', file);

  // 2. the overlay as the first element inside <body>
  const bodyMatch = html.match(/<body[^>]*>/);
  if (!bodyMatch) throw new Error(`[${file}] <body> not found`);
  const bodyTag = bodyMatch[0];
  html = replaceOnce(html, bodyTag, `${bodyTag}${LOADER_HTML}`, 'loader markup', file);

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`✓ ${file} updated`);
}

console.log('\nPreloader added to all templates.');
