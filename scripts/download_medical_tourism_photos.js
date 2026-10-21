/**
 * Downloads the medical tourism photography from the shared Google Drive
 * folder into `assets/photos/`.
 *
 * The folder contains macOS AppleDouble resource forks (`._*`, ~4 KB, not
 * real images) alongside the actual JPEGs, so every download is validated
 * against the JPEG magic bytes and a minimum size before being kept.
 *
 * Usage: node scripts/download_medical_tourism_photos.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const PHOTOS_DIR = path.join(__dirname, '..', 'assets', 'photos_raw');
const FOLDER_ID = '14mCzy93k91zhl3Dur9Jsa2oWiJcdBQIR';

// Discovered from the shared folder listing (see scripts/list_drive_folder.js)
const FILES = [
  ['1bepkScIhBMRG8jxNqTbdMIQwfQ_K2SRH', '_shutterstock_2851464.jpg'],
  ['1_6qCl9cfE0lF0Fhldg6YrwDwYqMM_Mie', '_shutterstock_3538646.jpg'],
  ['1SyhmD91tcP7xxnkJm7HWEV26CmxpbsT6', '_shutterstock_10702813.jpg'],
  ['16kymK_ipds2L96beQ_pYYPclhzoFHCzN', '_shutterstock_48635881.jpg'],
  ['1DhHWhWGtQ-ddouk1j1I-HWE4w54sGc9v', '_shutterstock_51824953.jpg'],
  ['1g1l9IHb06HDrnApZ2rzMN_TU1n46BGcY', '_shutterstock_55056100.jpg'],
  ['1eBLUmEguBLRqWtVEHlieY_qWhWHL9Xf_', '_shutterstock_58949230.jpg'],
  ['1XzC4L45YQptgcUQEhtZBWPNkiQHhId5x', '_shutterstock_60495880.jpg'],
  ['1tzTYDEQHsXG_RVPDk6dy6hLmSZxuaY-H', '_shutterstock_62679931.jpg'],
  ['1QuSIxYewFdjvWiUJ1Zn9OUncbdHw63', '_shutterstock_64792054.jpg'],
  ['1-WOaF547ffQtqM2_lGSLcxR8fnb6901B', '_shutterstock_68511628.jpg'],
  ['1GBRQaveLDVZ8w0HZkgI_8NsgiFhrJlDI', '_shutterstock_71283418.jpg'],
  ['1RIVvDnkTEuMM2HedwRwUV7aV2eTsW0ui', '_shutterstock_72569095.jpg'],
  ['15d2__1ojcl3f42mHwF1xZnc-aPqwRD2t', '_shutterstock_79145905.jpg'],
  ['1Sl8QQQgV3qPD2w9Hv2R24PPD8D5LN_pz', '_shutterstock_88515751.jpg'],
  ['1bln9LHnKDenEaZp7kGI0V450L6p04vyK', '_shutterstock_127690178.jpg'],
  ['1_leH2KipGnhsktQ6zzPIwmB8qVY73ZWa', '_shutterstock_128419886.jpg'],
  ['1eAPoVPStK5ZP8ahwarCW0AskdTOo_L80', '_shutterstock_146221970.jpg'],
  ['10j_jtOkNH5fZT-Sn7BjS9t6d2HiVFpfX', '_shutterstock_321601295.jpg'],
  ['11TkjwRUXi8IVYh-yNjRareS_EPpXNYRX', '_shutterstock_392528248.jpg'],
  ['130cepUgiUnAbk2BnefV7PQgm5wpX5G3j', '_shutterstock_516817852.jpg'],
  ['1I_9rUsqu85SmUHufjJFX94E0OLxT183B', '_shutterstock_533681032.jpg'],
  ['1BGAg2VNnoIVFP2JxBFVm52NWneiWHz5p', '_shutterstock_533681074.jpg'],
  ['1X8xxZKQD1eeO6Ht9ddj6niUcikYUDHWX', '_shutterstock_534761320.jpg'],
  ['1JlD-mBeQpTcQ3W94-DaD131A8Yc660sk', '_shutterstock_535279426.jpg'],
  ['1gvjoSGdJxVGBsX1NFLTwTbGEO85PFk4r', '_shutterstock_535689190.jpg'],
  ['1hUKlZawD8HXHTVn1tFLrcAVbiB08wZ4X', '_shutterstock_536018104.jpg'],
  ['1uGzZL4_Na14h31iUIo3WZDcN67-v5LpN', '_shutterstock_536480503.jpg'],
  ['1pGg3JmTzoUBnBlLBQI_4Xg54w6mYcyTp', '1.jpg'],
  ['1yz_WszVoeK9Vs8m_dnRFna8iuWSnZ6Et', '2.jpg'],
  ['1Doe51PkbuqcXVpu6YbHJEEsJ3jN7x3in', '3.jpg'],
  ['1Uq6hnTfs1CmNjIQkHJno2h-gSg_AgXYL', 'shutterstock_2851464.jpg'],
  ['1UVjC_5z_VMq29n7FVqny0VUvaSxsuatd', 'shutterstock_3538646.jpg'],
  ['152ZBCXMZzOg8gs5tUSUFx3eX7BIduCob', 'shutterstock_10702813.jpg'],
  ['1GuVqmH6Eq2pKSEH55HOBzGefQSw1pViD', 'shutterstock_48635881.jpg'],
  ['1kHJpOqsKkAMq_tYnWFlYEY9ayODG0mGA', 'shutterstock_51824953.jpg'],
  ['19u3QLYQZFSILQyVp3QIA8Vw115wXNgWY', 'shutterstock_55056100.jpg'],
  ['1r1CaFV5f6KVFeBQMHbTQ99lD2K4Cc69O', 'shutterstock_58949230.jpg'],
  ['1KwRYYx2VQaFPnkfqeLV1EHilApQKW4QZ', 'shutterstock_60495880.jpg'],
  ['1m5_mcgWQPgxnlJQpVJg8PircpSg-f65F', 'shutterstock_62679931.jpg'],
  ['1lYSLXFHyH0kKtd7SEA4HHvRlURkMXmee', 'shutterstock_64792054.jpg'],
  ['1JrN-KNv9XxsdEnMnyfgcBgH8kYkldhQS', 'shutterstock_68511628.jpg'],
  ['1r8fXpUxNyfb022DZrf213Afvu-FVN7ZG', 'shutterstock_71283418.jpg'],
  ['12-GRtwyk46DAcHZqyXf3k_L9pNuhIQAr', 'shutterstock_72569095.jpg'],
  ['1GGqRGUj0ITXM3SLyzQeDCgKWEAO3ArL8', 'shutterstock_79145905.jpg'],
  ['1Y5v4du7FFLnT1CZXjDKi8cNs9oMt1BpK', 'shutterstock_88515751.jpg'],
  ['1alo9RKl7Z_KvUz9P16V-0wDyYUDrmQ--', 'shutterstock_127690178.jpg'],
  ['1Op7IlE8dTqSUvOleE2FfiB8i2P_Sf7QY', 'shutterstock_128419886.jpg'],
];

const MIN_BYTES = 20 * 1024; // ignore AppleDouble forks (~4 KB)

function get(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(get(res.headers.location));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () =>
        resolve({ status: res.statusCode, type: res.headers['content-type'] || '', body: Buffer.concat(chunks) })
      );
    }).on('error', () => resolve(null));
  });
}

function isJpeg(buf) {
  return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

async function download(id) {
  const base = `https://drive.google.com/uc?export=download&id=${id}`;
  let res = await get(base);
  if (!res) return null;

  // Large files return an HTML interstitial — confirm and retry
  if (res.type.includes('text/html') || (isJpeg(res.body) === false && res.body.length < 20000)) {
    const confirmMatch = res.body.toString('utf8').match(/confirm=([0-9A-Za-z_-]+)/);
    const confirm = confirmMatch ? confirmMatch[1] : 't';
    res = await get(`${base}&confirm=${confirm}`);
    if (!res) return null;
  }
  return res;
}

(async () => {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  console.log(`Downloading ${FILES.length} Drive entries to assets/photos/ ...\n`);

  const kept = [];
  const skipped = [];

  for (const [id, name] of FILES) {
    const res = await download(id);
    if (!res) { skipped.push([name, 'request failed']); continue; }
    if (!isJpeg(res.body)) { skipped.push([name, `not a jpeg (${res.type})`]); continue; }
    if (res.body.length < MIN_BYTES) { skipped.push([name, `too small (${res.body.length}b)`]); continue; }

    const dest = path.join(PHOTOS_DIR, name);
    fs.writeFileSync(dest, res.body);
    kept.push([name, res.body.length]);
    console.log(`✓ ${name}  (${(res.body.length / 1024).toFixed(0)} KB)`);
  }

  console.log(`\nKept ${kept.length} real photos, skipped ${skipped.length} non-image/fork entries.`);
  if (skipped.length) {
    console.log('\nSkipped:');
    skipped.forEach(([n, why]) => console.log(`  - ${n}: ${why}`));
  }
})();
