/**
 * Prepares the medical tourism photography for the site:
 *   - heroes/    1920px wide (hero background layers)
 *   - editorial/ 1000px wide (photo bands & grids)
 *
 * Source: the raw downloads produced by
 * scripts/download_medical_tourism_photos.js (assets/photos_raw/).
 * The raw originals are removed once the curated set has been written.
 *
 * Usage: node scripts/prepare_photo_assets.js
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'photos_raw');
const HERO_DIR = path.join(ROOT, 'assets', 'photos', 'heroes');
const EDIT_DIR = path.join(ROOT, 'assets', 'photos', 'editorial');

// source file -> { target dir, output name }
const MAP = {
  shutterstock_2851464: { dir: HERO_DIR, out: 'agenda-hero.jpg', width: 1920 },
  shutterstock_68511628: { dir: HERO_DIR, out: 'facilitadores-hero.jpg', width: 1920 },

  shutterstock_10702813: { dir: EDIT_DIR, out: 'cirugia.jpg', width: 1000 },
  shutterstock_62679931: { dir: EDIT_DIR, out: 'consulta-paciente.jpg', width: 1000 },
  shutterstock_60495880: { dir: EDIT_DIR, out: 'investigacion.jpg', width: 1000 },
  shutterstock_128419886: { dir: EDIT_DIR, out: 'especialistas.jpg', width: 1000 },
  shutterstock_79145905: { dir: EDIT_DIR, out: 'medica.jpg', width: 1000 },
  shutterstock_55056100: { dir: EDIT_DIR, out: 'dental.jpg', width: 1000 },
  shutterstock_88515751: { dir: EDIT_DIR, out: 'laboratorio.jpg', width: 1000 },
  shutterstock_58949230: { dir: EDIT_DIR, out: 'medico.jpg', width: 1000 },
  shutterstock_51824953: { dir: EDIT_DIR, out: 'biotecnologia.jpg', width: 1000 },
};

function ffmpeg(args) {
  const res = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'pipe' });
  return res.status === 0;
}

if (!fs.existsSync(SRC)) {
  console.error(`Missing source folder: ${SRC}`);
  console.error('Run scripts/download_medical_tourism_photos.js first.');
  process.exit(1);
}

// Clean the output tree first, then write the curated assets into it
fs.rmSync(path.join(ROOT, 'assets', 'photos'), { recursive: true, force: true });
fs.rmSync(path.join(ROOT, 'tmp_sheet'), { recursive: true, force: true });
fs.mkdirSync(HERO_DIR, { recursive: true });
fs.mkdirSync(EDIT_DIR, { recursive: true });

let total = 0;
for (const [src, cfg] of Object.entries(MAP)) {
  const inPath = path.join(SRC, `${src}.jpg`);
  if (!fs.existsSync(inPath)) {
    console.warn(`- SKIP ${src}.jpg (not found)`);
    continue;
  }
  const outPath = path.join(cfg.dir, cfg.out);
  // Width-constrained so every photo in a band shares the same visual weight
  const scale = cfg.width === 1920
    ? `scale='if(gt(iw,ih),1920,-2)':'if(gt(iw,ih),-2,1920)':flags=lanczos`
    : `scale=${cfg.width}:-2:flags=lanczos`;
  const ok = ffmpeg(['-i', inPath, '-vf', scale, '-q:v', '5', outPath]);
  if (!ok) {
    console.warn(`- FAILED ${cfg.out}`);
    continue;
  }
  const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
  total += fs.statSync(outPath).size;
  console.log(`✓ ${path.relative(ROOT, outPath).replace(/\\/g, '/')}  (${kb} KB)`);
}

// Remove the raw downloads — only the curated assets ship
fs.rmSync(SRC, { recursive: true, force: true });

console.log(`\nTotal curated photography: ${(total / 1024 / 1024).toFixed(2)} MB`);
