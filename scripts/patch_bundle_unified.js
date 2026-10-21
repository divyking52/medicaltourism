/**
 * Inlines the i18n dictionary, the i18n engine and the platforms stage
 * into the unified standalone build (`bundle_unified.js`).
 *
 * Usage: node scripts/patch_bundle_unified.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'bundle_unified.js');

let src = fs.readFileSync(FILE, 'utf8');

const anchor = "\\n  <!-- Main Application Script (Inlined) -->";
const injection = "\\n${i18nDict ? `  <!-- Site i18n Dictionary (Inlined) -->\\n  <script>\\n${i18nDict}\\n  </script>\\n` : ''}${i18nEngine ? `  <!-- Site i18n Engine (Inlined) -->\\n  <script>\\n${i18nEngine}\\n  </script>\\n` : ''}${platformsStage ? `  <!-- Platforms Stage (Inlined) -->\\n  <script>\\n${platformsStage}\\n  </script>\\n` : ''}  <!-- Main Application Script (Inlined) -->";

if (src.includes('platformsStage ?')) {
  console.log('bundle_unified.js already patched');
} else {
  const parts = src.split(anchor);
  if (parts.length !== 2) throw new Error(`anchor matched ${parts.length - 1} times`);
  src = parts.join(injection);
  fs.writeFileSync(FILE, src, 'utf8');
  console.log('bundle_unified.js patched: i18n + platforms stage inlined');
}
