/**
 * Inlines `platforms-stage.js` into the bundled pages.
 * Usage: node scripts/patch_bundle_platforms.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'bundle.js');

let src = fs.readFileSync(FILE, 'utf8');

const anchor = "` : ''}  <!-- Main Application Script (Inlined) -->";
const injection = "` : ''}${platformsStage ? `  <!-- Platforms Stage (Inlined) -->\n  <script>\n${platformsStage}\n  </script>\n` : ''}  <!-- Main Application Script (Inlined) -->";

if (src.includes('platformsStage ?')) {
  console.log('bundle.js already patched');
} else {
  const parts = src.split(anchor);
  if (parts.length !== 2) throw new Error(`anchor matched ${parts.length - 1} times`);
  src = parts.join(injection);
  fs.writeFileSync(FILE, src, 'utf8');
  console.log('bundle.js patched: platforms stage inlined');
}
